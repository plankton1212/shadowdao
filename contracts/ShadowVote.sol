// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ShadowVote {
    struct Proposal {
        address creator;
        string title;
        uint8 optionCount;
        uint256 deadline;
        uint256 quorum;
        uint256 voterCount;
        bool revealed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint8 => euint32)) private tallies;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => euint32)) private userEncryptedVotes;
    mapping(address => uint256[]) private userProposals;
    mapping(address => uint256[]) private userVotes;
    uint256 public proposalCount;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title,
        uint8 optionCount,
        uint256 deadline,
        uint256 quorum
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ResultsRevealed(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, address indexed creator);
    event DeadlineExtended(uint256 indexed proposalId, uint256 newDeadline);

    function createProposal(
        string calldata _title,
        uint8 _optionCount,
        uint256 _deadline,
        uint256 _quorum
    ) external returns (uint256) {
        require(_optionCount >= 2 && _optionCount <= 10, "Invalid option count");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 proposalId = proposalCount;
        proposalCount++;

        proposals[proposalId] = Proposal({
            creator: msg.sender,
            title: _title,
            optionCount: _optionCount,
            deadline: _deadline,
            quorum: _quorum,
            voterCount: 0,
            revealed: false
        });

        for (uint8 i = 0; i < _optionCount; i++) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            tallies[proposalId][i] = zero;
        }

        userProposals[msg.sender].push(proposalId);

        emit ProposalCreated(proposalId, msg.sender, _title, _optionCount, _deadline, _quorum);
        return proposalId;
    }

    function vote(uint256 _proposalId, InEuint32 calldata _encryptedOption) external {
        Proposal storage proposal = proposals[_proposalId];
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        require(block.timestamp <= proposal.deadline, "Voting ended");
        require(proposal.optionCount > 0, "Proposal does not exist");

        euint32 option = FHE.asEuint32(_encryptedOption);

        for (uint8 i = 0; i < proposal.optionCount; i++) {
            ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
            euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
            tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
            FHE.allowThis(tallies[_proposalId][i]);
        }

        // Store encrypted vote for self-verification (permit-gated)
        userEncryptedVotes[_proposalId][msg.sender] = option;
        FHE.allowSender(userEncryptedVotes[_proposalId][msg.sender]);

        hasVoted[_proposalId][msg.sender] = true;
        proposal.voterCount++;
        userVotes[msg.sender].push(_proposalId);

        emit VoteCast(_proposalId, msg.sender);
    }

    function revealResults(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.deadline, "Voting still active");
        require(proposal.voterCount >= proposal.quorum, "Quorum not reached");
        require(!proposal.revealed, "Already revealed");

        for (uint8 i = 0; i < proposal.optionCount; i++) {
            FHE.allowPublic(tallies[_proposalId][i]);
        }

        proposal.revealed = true;
        emit ResultsRevealed(_proposalId);
    }

    /// @notice Check if quorum is met using FHE comparison (encrypted quorum validation)
    /// @dev Uses FHE.gte() to compare encrypted vote count against quorum threshold
    ///      without revealing the actual number of votes. Result is an encrypted boolean.
    function checkQuorumEncrypted(uint256 _proposalId) external returns (ebool) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.optionCount > 0, "Proposal does not exist");

        // Sum all encrypted tallies to get total encrypted vote count
        euint32 totalEncrypted = tallies[_proposalId][0];
        for (uint8 i = 1; i < proposal.optionCount; i++) {
            totalEncrypted = FHE.add(totalEncrypted, tallies[_proposalId][i]);
        }

        // FHE.gte: encrypted comparison — is totalVotes >= quorum?
        // Neither value is revealed; result is an encrypted boolean
        euint32 quorumEncrypted = FHE.asEuint32(uint32(proposal.quorum));
        return FHE.gte(totalEncrypted, quorumEncrypted);
    }

    /// @notice Find the maximum encrypted tally across all options (private winner detection)
    /// @dev Uses FHE.max() to determine the highest vote count without revealing any tallies.
    ///      The returned euint32 handle can only be decrypted after FHE.allowPublic().
    function getEncryptedMaxTally(uint256 _proposalId) external returns (euint32) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.optionCount > 0, "Proposal does not exist");

        euint32 maxTally = tallies[_proposalId][0];
        for (uint8 i = 1; i < proposal.optionCount; i++) {
            maxTally = FHE.max(maxTally, tallies[_proposalId][i]);
        }
        return maxTally;
    }

    /// @notice Compute encrypted vote differential between two options
    /// @dev Uses FHE.sub() to calculate the difference between two option tallies
    ///      without revealing either value. Useful for margin-of-victory analysis.
    function getEncryptedDifferential(
        uint256 _proposalId,
        uint8 _optionA,
        uint8 _optionB
    ) external returns (euint32) {
        Proposal storage proposal = proposals[_proposalId];
        require(_optionA < proposal.optionCount && _optionB < proposal.optionCount, "Invalid option");

        // FHE.sub: encrypted subtraction — difference without revealing counts
        return FHE.sub(tallies[_proposalId][_optionA], tallies[_proposalId][_optionB]);
    }

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator can cancel");
        require(proposal.voterCount == 0, "Cannot cancel after votes cast");
        require(!proposal.revealed, "Already revealed");
        require(proposal.optionCount > 0, "Proposal does not exist");

        // Set deadline to past to prevent voting, zero out optionCount to mark cancelled
        proposal.deadline = 0;
        proposal.optionCount = 0;

        emit ProposalCancelled(_proposalId, msg.sender);
    }

    function extendDeadline(uint256 _proposalId, uint256 _newDeadline) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator can extend");
        require(!proposal.revealed, "Already revealed");
        require(proposal.optionCount > 0, "Proposal does not exist");
        require(_newDeadline > proposal.deadline, "New deadline must be later");

        proposal.deadline = _newDeadline;

        emit DeadlineExtended(_proposalId, _newDeadline);
    }

    function getMyVote(uint256 _proposalId) external view returns (euint32) {
        require(hasVoted[_proposalId][msg.sender], "Not voted");
        return userEncryptedVotes[_proposalId][msg.sender];
    }

    function getEncryptedTally(uint256 _proposalId, uint8 _optionIndex) external view returns (euint32) {
        return tallies[_proposalId][_optionIndex];
    }

    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            address creator,
            string memory title,
            uint8 optionCount,
            uint256 deadline,
            uint256 quorum,
            uint256 voterCount,
            bool revealed
        )
    {
        Proposal storage p = proposals[_proposalId];
        return (p.creator, p.title, p.optionCount, p.deadline, p.quorum, p.voterCount, p.revealed);
    }

    function hasUserVoted(uint256 _proposalId, address _user) external view returns (bool) {
        return hasVoted[_proposalId][_user];
    }

    function getUserProposals(address _user) external view returns (uint256[] memory) {
        return userProposals[_user];
    }

    function getUserVotes(address _user) external view returns (uint256[] memory) {
        return userVotes[_user];
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}
