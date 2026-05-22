// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev ShadowVoteV2 endpoint that receives an encrypted voting-power handle.
interface IShadowVoteWeight {
    function receiveVotingPower(address voter, euint32 power) external;
}

/// @title ShadowToken  -  confidential governance token for ShadowDAO (Wave 5)
/// @notice An FHERC20-style token whose balances are FHE ciphertexts (euint32).
///         Nobody  -  not the issuer, not an observer  -  can read a holder's
///         balance on-chain; only the holder can decrypt their own.
/// @dev    Purpose: a *trustless* source of weighted-voting power. Before Wave 5,
///         ShadowVoteV2 voting power was assigned by an admin (setVotingPower).
///         A holder can now call `syncVotingPower` to push their own encrypted
///         token balance into ShadowVoteV2 as their voting power  -  weight is
///         then derived from holdings, not centrally granted.
///
///         Honest simplification (hackathon scope): power reflects the holder's
///         balance at sync time, not a historical per-proposal snapshot. A
///         block-checkpointed snapshot (the Compound/ConfidentialERC20Votes
///         pattern) is the production follow-up.
contract ShadowToken {
    string public constant name = "ShadowDAO Governance Token";
    string public constant symbol = "SHADOW";
    uint8 public constant decimals = 0; // whole-unit governance token (euint32-bounded)

    address public owner;

    // Encrypted balances. `hasBalance` tracks first-time holders so a fresh
    // euint32 is initialised rather than added to an uninitialised handle.
    mapping(address => euint32) private balances;
    mapping(address => bool) private hasBalance;
    uint256 public holderCount;

    event Minted(address indexed to);
    event Transferred(address indexed from, address indexed to);
    event VotingPowerSynced(address indexed holder, address indexed shadowVote);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Mint encrypted tokens to an account (owner only  -  e.g. genesis allocation).
    /// @dev The recipient is granted decrypt access to their own balance; the
    ///      owner is NOT  -  the issuer cannot read balances it has minted.
    function mint(address to, InEuint32 calldata encryptedAmount) external onlyOwner {
        require(to != address(0), "Zero address");
        euint32 amount = FHE.asEuint32(encryptedAmount);

        if (hasBalance[to]) {
            balances[to] = FHE.add(balances[to], amount);
        } else {
            balances[to] = amount;
            hasBalance[to] = true;
            holderCount++;
        }
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);
        emit Minted(to);
    }

    /// @notice Confidentially transfer encrypted tokens.
    /// @dev Insufficient balance does not revert (that would leak the balance):
    ///      FHE.select sends 0 when the encrypted check fails, so the call
    ///      succeeds either way and an observer learns nothing.
    function transfer(address to, InEuint32 calldata encryptedAmount) external {
        require(to != address(0) && to != msg.sender, "Invalid recipient");
        require(hasBalance[msg.sender], "No balance");

        euint32 amount = FHE.asEuint32(encryptedAmount);
        ebool canSend = FHE.gte(balances[msg.sender], amount);
        euint32 sent = FHE.select(canSend, amount, FHE.asEuint32(0));

        balances[msg.sender] = FHE.sub(balances[msg.sender], sent);
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);

        if (hasBalance[to]) {
            balances[to] = FHE.add(balances[to], sent);
        } else {
            balances[to] = sent;
            hasBalance[to] = true;
            holderCount++;
        }
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        emit Transferred(msg.sender, to);
    }

    /// @notice Push the caller's encrypted balance into ShadowVoteV2 as voting power.
    /// @dev Grants `shadowVote` FHE access to the balance handle, then hands it
    ///      over. This makes weighted-voting power trustless: it is the holder's
    ///      own encrypted balance, not an admin-assigned number.
    function syncVotingPower(address shadowVote) external {
        require(shadowVote != address(0), "Zero address");
        require(hasBalance[msg.sender], "No balance to sync");

        euint32 bal = balances[msg.sender];
        FHE.allow(bal, shadowVote);
        IShadowVoteWeight(shadowVote).receiveVotingPower(msg.sender, bal);

        emit VotingPowerSynced(msg.sender, shadowVote);
    }

    /// @notice Returns the caller's own encrypted balance handle for off-chain
    ///         decryption via an FHE permit. Only the holder can decrypt it.
    function getEncryptedBalance() external view returns (euint32) {
        require(hasBalance[msg.sender], "No balance");
        return balances[msg.sender];
    }

    /// @notice True if an account has ever received tokens.
    function isHolder(address account) external view returns (bool) {
        return hasBalance[account];
    }
}
