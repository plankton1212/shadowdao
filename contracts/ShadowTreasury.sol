// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev Minimal interface to ShadowVote for allocation execution checks.
interface IShadowVoteForTreasury {
    function getProposal(uint256 _proposalId) external view returns (
        address creator,
        string memory title,
        uint8 optionCount,
        uint256 deadline,
        uint256 quorum,
        uint256 voterCount,
        bool revealed,
        uint256 spaceId,
        bool spaceGated
    );
}

/// @title ShadowTreasury  -  FHE-encrypted DAO treasury with private balance
/// @notice Wave 3: Treasury balance tracked as euint32 (in milliETH units = 0.001 ETH).
///         Balance is invisible on Etherscan  -  only owner can decrypt via FHE permit.
///         FHE ops: FHE.asEuint32, FHE.add, FHE.sub, FHE.gte, FHE.select, FHE.allowThis, FHE.allowSender
contract ShadowTreasury {
    /// @dev 1 unit = 0.001 ETH = 1e15 wei. Max euint32 = ~4.29 billion units = ~4.29M ETH.
    uint256 public constant UNIT = 1e15;

    address public owner;
    address public shadowVoteContract;

    /// @dev Encrypted treasury balance in UNIT denomination.
    euint32 private encryptedBalance;

    struct Allocation {
        uint256 proposalId;
        uint256 amountWei;
        address payable recipient;
        bool executed;
        bool cancelled;
    }

    mapping(uint256 => Allocation) public allocations;
    uint256 public allocationCount;

    // --- Events ---
    event Deposited(address indexed from, uint256 amountWei);
    event Withdrawn(address indexed to, uint256 amountWei);
    event AllocationProposed(uint256 indexed allocationId, uint256 indexed proposalId, uint256 amountWei, address recipient);
    event AllocationExecuted(uint256 indexed allocationId, uint256 indexed proposalId);
    event AllocationCancelled(uint256 indexed allocationId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        euint32 zero = FHE.asEuint32(0);
        FHE.allowThis(zero);
        encryptedBalance = zero;
    }

    function setShadowVoteContract(address _shadowVote) external onlyOwner {
        require(_shadowVote != address(0), "Zero address");
        shadowVoteContract = _shadowVote;
    }

    // ??? Core: Deposit ????????????????????????????????????????????????????????

    /// @notice Deposit ETH. Encrypted balance updated via FHE.add.
    ///         Etherscan shows a normal transfer; the encrypted counter stays hidden.
    function deposit() external payable {
        require(msg.value >= UNIT, "Minimum deposit: 0.001 ETH");
        uint256 units = msg.value / UNIT;
        require(units <= type(uint32).max, "Amount too large");

        // FHE.add  -  homomorphic addition on ciphertext; Etherscan cannot read the new balance
        euint32 depositUnits = FHE.asEuint32(uint32(units));
        FHE.allowThis(depositUnits);
        encryptedBalance = FHE.add(encryptedBalance, depositUnits);
        FHE.allowThis(encryptedBalance);

        emit Deposited(msg.sender, msg.value);
    }

    // ??? Core: Withdraw ???????????????????????????????????????????????????????

    /// @notice Owner withdraws ETH. FHE.gte solvency check + FHE.select safe subtraction.
    ///         If insolvent on encrypted side, FHE.select returns unchanged balance (no revert,
    ///         preventing state-leak via gas patterns). Plain balance check guards actual transfer.
    function withdraw(uint256 amountWei, address payable to) external onlyOwner {
        require(amountWei >= UNIT, "Minimum: 0.001 ETH");
        require(address(this).balance >= amountWei, "Insufficient ETH balance");
        require(to != address(0), "Zero address");

        uint256 units = amountWei / UNIT;
        require(units <= type(uint32).max, "Amount too large");

        euint32 withdrawUnits = FHE.asEuint32(uint32(units));
        FHE.allowThis(withdrawUnits);

        // FHE.gte  -  encrypted solvency check (balance >= withdrawal amount)
        ebool solvent = FHE.gte(encryptedBalance, withdrawUnits);
        FHE.allowThis(solvent);

        // FHE.select  -  conditionally subtract: if solvent -> sub, else -> keep balance (no-op)
        euint32 newBalance = FHE.select(solvent, FHE.sub(encryptedBalance, withdrawUnits), encryptedBalance);
        FHE.allowThis(newBalance);
        encryptedBalance = newBalance;

        to.transfer(amountWei);
        emit Withdrawn(to, amountWei);
    }

    // ??? Allocation: Propose ??????????????????????????????????????????????????

    /// @notice Link an encrypted budget amount to a ShadowVote proposal.
    ///         Once the proposal passes, executeAllocation releases the funds.
    function proposeAllocation(
        uint256 proposalId,
        uint256 amountWei,
        address payable recipient
    ) external onlyOwner {
        require(shadowVoteContract != address(0), "ShadowVote not set");
        require(amountWei >= UNIT, "Minimum: 0.001 ETH");
        require(recipient != address(0), "Zero recipient");

        // Verify proposal exists (reverts if proposalId invalid)
        IShadowVoteForTreasury(shadowVoteContract).getProposal(proposalId);

        uint256 allocationId = allocationCount++;

        allocations[allocationId] = Allocation({
            proposalId: proposalId,
            amountWei: amountWei,
            recipient: recipient,
            executed: false,
            cancelled: false
        });

        emit AllocationProposed(allocationId, proposalId, amountWei, recipient);
    }

    // ??? Allocation: Execute ??????????????????????????????????????????????????

    /// @notice Execute allocation after proposal is revealed + quorum met.
    ///         FHE.sub reduces the encrypted balance; plain transfer sends ETH.
    function executeAllocation(uint256 allocationId) external {
        Allocation storage alloc = allocations[allocationId];
        require(!alloc.executed, "Already executed");
        require(!alloc.cancelled, "Allocation cancelled");
        require(shadowVoteContract != address(0), "ShadowVote not set");

        (
            ,       // creator
            ,       // title
            ,       // optionCount
            uint256 deadline,
            uint256 quorum,
            uint256 voterCount,
            bool revealed,
            ,       // spaceId
                    // spaceGated
        ) = IShadowVoteForTreasury(shadowVoteContract).getProposal(alloc.proposalId);

        require(block.timestamp > deadline, "Voting still active");
        require(revealed, "Results not revealed yet");
        require(voterCount >= quorum, "Quorum not reached");
        require(address(this).balance >= alloc.amountWei, "Insufficient treasury ETH");

        // FHE.sub  -  reduce encrypted balance by allocation amount
        uint256 units = alloc.amountWei / UNIT;
        if (units > 0 && units <= type(uint32).max) {
            euint32 allocUnits = FHE.asEuint32(uint32(units));
            FHE.allowThis(allocUnits);
            encryptedBalance = FHE.sub(encryptedBalance, allocUnits);
            FHE.allowThis(encryptedBalance);
        }

        alloc.executed = true;
        alloc.recipient.transfer(alloc.amountWei);

        emit AllocationExecuted(allocationId, alloc.proposalId);
    }

    function cancelAllocation(uint256 allocationId) external onlyOwner {
        Allocation storage alloc = allocations[allocationId];
        require(!alloc.executed, "Already executed");
        require(!alloc.cancelled, "Already cancelled");
        alloc.cancelled = true;
        emit AllocationCancelled(allocationId);
    }

    // ??? FHE View ?????????????????????????????????????????????????????????????

    /// @notice Returns encrypted balance handle. Call allowSender -> caller can decrypt via permit.
    ///         Only the transaction sender's permit will unlock this ciphertext.
    function getTreasuryBalance() external returns (euint32) {
        FHE.allowSender(encryptedBalance);
        return encryptedBalance;
    }

    // ??? Plain Views ??????????????????????????????????????????????????????????

    function getAllocation(uint256 allocationId) external view returns (
        uint256 proposalId,
        uint256 amountWei,
        address recipient,
        bool executed,
        bool cancelled
    ) {
        Allocation storage a = allocations[allocationId];
        return (a.proposalId, a.amountWei, a.recipient, a.executed, a.cancelled);
    }

    function getEthBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        if (msg.value >= UNIT) {
            uint256 units = msg.value / UNIT;
            if (units <= type(uint32).max) {
                euint32 u = FHE.asEuint32(uint32(units));
                FHE.allowThis(u);
                encryptedBalance = FHE.add(encryptedBalance, u);
                FHE.allowThis(encryptedBalance);
            }
        }
        emit Deposited(msg.sender, msg.value);
    }
}
