// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev Interface to ShadowVoteV2 for casting delegated votes.
interface IShadowVoteV2 {
    function vote(uint256 _proposalId, InEuint32 calldata _encryptedOption) external;
    function hasUserVoted(uint256 _proposalId, address _user) external view returns (bool);
}

/// @title ShadowDelegate  -  FHE vote delegation with encrypted power transfer
/// @notice Wave 4: delegates can vote on behalf of delegators.
///         Delegation relation is public (who -> whom) for leaderboard.
///         The actual voting power amounts remain encrypted (FHE).
///         FHE ops added: FHE.add (aggregate power), FHE.select (zero-out after delegate)
contract ShadowDelegate {
    address public owner;
    address public shadowVoteContract;

    // --- Delegation mapping (public: delegation is transparent, only amounts are encrypted) ---
    mapping(address => address) public delegatedTo;     // who you delegated to
    mapping(address => address[]) private delegators;    // who delegated to me
    mapping(address => uint256) public delegatorIndex;  // index in delegators[] for swap-and-pop

    // --- Encrypted power pool per delegate ---
    // delegatePower[delegate] = FHE.add of all delegators' powers
    mapping(address => euint32) private delegatePower;
    mapping(address => bool) private hasDelegatePower;

    // --- Delegation count (plain) for leaderboard ---
    mapping(address => uint256) public delegationCount;

    // --- All known delegates (for leaderboard) ---
    address[] public allDelegates;
    mapping(address => bool) public isKnownDelegate;

    // --- Events ---
    event Delegated(address indexed from, address indexed to);
    event Undelegated(address indexed from, address indexed previousDelegate);
    event DelegateVoteCast(uint256 indexed proposalId, address indexed delegate, uint256 delegatorCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setShadowVoteContract(address _shadowVote) external onlyOwner {
        require(_shadowVote != address(0), "Zero address");
        shadowVoteContract = _shadowVote;
    }

    // ??? Delegate ?????????????????????????????????????????????????????????????

    /// @notice Delegate your voting rights to `to`.
    ///         Delegation is public (on-chain mapping). Vote amounts stay encrypted.
    ///         Double-delegation is blocked: must undelegate first.
    function delegate(address to, InEuint32 calldata _myPower) external {
        require(to != address(0), "Cannot delegate to zero");
        require(to != msg.sender, "Cannot self-delegate");
        require(delegatedTo[msg.sender] == address(0), "Already delegated  -  undelegate first");

        delegatedTo[msg.sender] = to;
        delegators[to].push(msg.sender);
        delegatorIndex[msg.sender] = delegators[to].length - 1;
        delegationCount[to]++;

        // Register delegate for leaderboard
        if (!isKnownDelegate[to]) {
            isKnownDelegate[to] = true;
            allDelegates.push(to);
        }

        // FHE.add  -  aggregate delegator power into delegate's encrypted pool
        euint32 power = FHE.asEuint32(_myPower);
        FHE.allowThis(power);

        if (hasDelegatePower[to]) {
            delegatePower[to] = FHE.add(delegatePower[to], power);
        } else {
            delegatePower[to] = power;
            hasDelegatePower[to] = true;
        }
        FHE.allowThis(delegatePower[to]);

        emit Delegated(msg.sender, to);
    }

    /// @notice Reclaim your delegation. Subtracts your power from delegate's pool.
    function undelegate(InEuint32 calldata _myPower) external {
        address currentDelegate = delegatedTo[msg.sender];
        require(currentDelegate != address(0), "Not delegating");

        delegatedTo[msg.sender] = address(0);
        delegationCount[currentDelegate]--;

        // Swap-and-pop to remove from delegators[]
        uint256 idx = delegatorIndex[msg.sender];
        uint256 lastIdx = delegators[currentDelegate].length - 1;
        if (idx != lastIdx) {
            address last = delegators[currentDelegate][lastIdx];
            delegators[currentDelegate][idx] = last;
            delegatorIndex[last] = idx;
        }
        delegators[currentDelegate].pop();

        // FHE.select  -  zero-out power contribution: if hasPower -> FHE.sub, else keep
        if (hasDelegatePower[currentDelegate]) {
            euint32 myPower = FHE.asEuint32(_myPower);
            FHE.allowThis(myPower);

            // FHE.select  -  safe subtract (if pool >= myPower then sub, else zero out pool)
            ebool canSub = FHE.gte(delegatePower[currentDelegate], myPower);
            FHE.allowThis(canSub);
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            delegatePower[currentDelegate] = FHE.select(
                canSub,
                FHE.sub(delegatePower[currentDelegate], myPower),
                zero
            );
            FHE.allowThis(delegatePower[currentDelegate]);
        }

        emit Undelegated(msg.sender, currentDelegate);
    }

    // ??? Vote as delegate ?????????????????????????????????????????????????????

    /// @notice Cast a vote on behalf of all delegators.
    ///         Uses the delegate's own wallet (msg.sender is the delegate).
    ///         The vote is cast directly on ShadowVoteV2  -  FHE.mul is applied inside that contract.
    function voteAsDelegate(uint256 _proposalId, InEuint32 calldata _encryptedOption) external {
        require(shadowVoteContract != address(0), "ShadowVote not set");
        require(delegators[msg.sender].length > 0, "No delegators");
        require(
            !IShadowVoteV2(shadowVoteContract).hasUserVoted(_proposalId, msg.sender),
            "Already voted on this proposal"
        );

        IShadowVoteV2(shadowVoteContract).vote(_proposalId, _encryptedOption);

        emit DelegateVoteCast(_proposalId, msg.sender, delegators[msg.sender].length);
    }

    // ??? Leaderboard ??????????????????????????????????????????????????????????

    /// @notice Returns top delegates sorted by delegation count (plain count, not encrypted power).
    ///         Amounts stay hidden; only participation ranking is visible.
    function getTopDelegates(uint8 limit) external view returns (
        address[] memory delegates,
        uint256[] memory counts
    ) {
        uint256 total = allDelegates.length;
        uint256 resultLen = total < limit ? total : limit;

        // Simple insertion sort for small arrays (leaderboard ? 20 typically)
        address[] memory sorted = new address[](total);
        for (uint256 i = 0; i < total; i++) sorted[i] = allDelegates[i];

        for (uint256 i = 0; i < total; i++) {
            for (uint256 j = i + 1; j < total; j++) {
                if (delegationCount[sorted[j]] > delegationCount[sorted[i]]) {
                    address tmp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = tmp;
                }
            }
        }

        delegates = new address[](resultLen);
        counts = new uint256[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            delegates[i] = sorted[i];
            counts[i] = delegationCount[sorted[i]];
        }
    }

    // ??? Views ????????????????????????????????????????????????????????????????

    function getDelegateOf(address user) external view returns (address) {
        return delegatedTo[user];
    }

    function getDelegators(address delegate_) external view returns (address[] memory) {
        return delegators[delegate_];
    }

    /// @notice Returns delegate's encrypted aggregate power (only delegate can decrypt via permit)
    function getDelegatedPower(address delegate_) external returns (euint32) {
        require(hasDelegatePower[delegate_], "No delegated power");
        FHE.allowSender(delegatePower[delegate_]);
        return delegatePower[delegate_];
    }

    function getDelegateCount() external view returns (uint256) {
        return allDelegates.length;
    }
}
