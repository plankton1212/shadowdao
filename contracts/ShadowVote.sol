// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev Minimal interface to ShadowSpace for membership checks and proposal count updates.
interface IShadowSpace {
    function isSpaceMember(uint256 _spaceId, address _user) external view returns (bool);
    function incrementProposalCount(uint256 _spaceId) external;
}

/// @title ShadowVote — FHE-encrypted on-chain voting with optional Space gating
/// @notice Wave 2: proposals can be linked to a ShadowSpace DAO.
///         Space-gated proposals restrict voting to Space members only.
contract ShadowVote {
    struct Proposal {
        address creator;
        string title;
        uint8 optionCount;
        uint256 deadline;
        uint256 quorum;
        uint256 voterCount;
        bool revealed;
        uint256 spaceId;   // 0 if not space-gated
        bool spaceGated;   // true = only space members may vote
    }

    // --- Access control ---
    address public owner;
    /// @dev Set to ShadowSpace address after deployment to enable space-gated voting.
    address public shadowSpaceContract;

    // --- Storage ---
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint8 => euint32)) private tallies;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => euint32)) private userEncryptedVotes;
    mapping(address => uint256[]) private userProposals;
    mapping(address => uint256[]) private userVotes;
    /// @dev spaceId => list of proposalIds created under that space
    mapping(uint256 => uint256[]) private spaceProposals;
    uint256 public proposalCount;

    // --- Events ---
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title,
        uint8 optionCount,
        uint256 deadline,
        uint256 quorum,
        uint256 spaceId,
        bool spaceGated
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ResultsRevealed(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, address indexed creator);
    event DeadlineExtended(uint256 indexed proposalId, uint256 newDeadline);

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // --- Admin ---

    /// @notice Wire up ShadowSpace so space-gated voting and proposal counts work.
    function setShadowSpaceContract(address _shadowSpace) external onlyOwner {
        require(_shadowSpace != address(0), "Zero address");
        shadowSpaceContract = _shadowSpace;
    }

    // --- Core ---

    /// @param _spaceId  Space to link this proposal to. Ignored when _spaceGated=false.
    /// @param _spaceGated  If true, only members of _spaceId may vote. Creator must also be a member.
    function createProposal(
        string calldata _title,
        uint8 _optionCount,
        uint256 _deadline,
        uint256 _quorum,
        uint256 _spaceId,
        bool _spaceGated
    ) external returns (uint256) {
        require(_optionCount >= 2 && _optionCount <= 10, "Invalid option count");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        // Space-gated: creator must be a member of the space
        if (_spaceGated && shadowSpaceContract != address(0)) {
            require(
                IShadowSpace(shadowSpaceContract).isSpaceMember(_spaceId, msg.sender),
                "Not a space member"
            );
        }

        uint256 proposalId = proposalCount;
        proposalCount++;

        proposals[proposalId] = Proposal({
            creator: msg.sender,
            title: _title,
            optionCount: _optionCount,
            deadline: _deadline,
            quorum: _quorum,
            voterCount: 0,
            revealed: false,
            spaceId: _spaceGated ? _spaceId : 0,
            spaceGated: _spaceGated
        });

        // Initialize encrypted tallies to zero
        for (uint8 i = 0; i < _optionCount; i++) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            tallies[proposalId][i] = zero;
        }

        userProposals[msg.sender].push(proposalId);

        // Register in space index and increment space's proposal counter
        if (_spaceGated) {
            spaceProposals[_spaceId].push(proposalId);
            if (shadowSpaceContract != address(0)) {
                IShadowSpace(shadowSpaceContract).incrementProposalCount(_spaceId);
            }
        }

        emit ProposalCreated(
            proposalId, msg.sender, _title, _optionCount, _deadline, _quorum,
            _spaceGated ? _spaceId : 0, _spaceGated
        );
        return proposalId;
    }

    function vote(uint256 _proposalId, InEuint32 calldata _encryptedOption) external {
        Proposal storage proposal = proposals[_proposalId];
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        require(block.timestamp <= proposal.deadline, "Voting ended");
        require(proposal.optionCount > 0, "Proposal does not exist");

        // Space membership gate: only members of the linked Space may vote
        if (proposal.spaceGated && shadowSpaceContract != address(0)) {
            require(
                IShadowSpace(shadowSpaceContract).isSpaceMember(proposal.spaceId, msg.sender),
                "Not a space member"
            );
        }

        euint32 option = FHE.asEuint32(_encryptedOption);

        // FHE tally: for each option, add 1 if this is the chosen option (encrypted comparison)
        for (uint8 i = 0; i < proposal.optionCount; i++) {
            ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
            euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
            tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
            FHE.allowThis(tallies[_proposalId][i]);
        }

        // Store encrypted vote for self-verification (permit-gated, only sender can decrypt)
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

        // allowPublic promotes each tally from private to publicly decryptable
        for (uint8 i = 0; i < proposal.optionCount; i++) {
            FHE.allowPublic(tallies[_proposalId][i]);
        }

        proposal.revealed = true;
        emit ResultsRevealed(_proposalId);
    }

    /// @notice FHE.gte() — encrypted quorum check without revealing vote count
    function checkQuorumEncrypted(uint256 _proposalId) external returns (ebool) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.optionCount > 0, "Proposal does not exist");

        euint32 totalEncrypted = tallies[_proposalId][0];
        for (uint8 i = 1; i < proposal.optionCount; i++) {
            totalEncrypted = FHE.add(totalEncrypted, tallies[_proposalId][i]);
            FHE.allowThis(totalEncrypted);
        }

        euint32 quorumEncrypted = FHE.asEuint32(uint32(proposal.quorum));
        ebool result = FHE.gte(totalEncrypted, quorumEncrypted);
        FHE.allowSender(result);
        return result;
    }

    /// @notice FHE.max() — encrypted winner detection without revealing individual tallies
    function getEncryptedMaxTally(uint256 _proposalId) external returns (euint32) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.optionCount > 0, "Proposal does not exist");

        euint32 maxTally = tallies[_proposalId][0];
        for (uint8 i = 1; i < proposal.optionCount; i++) {
            maxTally = FHE.max(maxTally, tallies[_proposalId][i]);
            FHE.allowThis(maxTally);
        }
        FHE.allowSender(maxTally);
        return maxTally;
    }

    /// @notice FHE.sub() — encrypted margin-of-victory between two options
    function getEncryptedDifferential(
        uint256 _proposalId,
        uint8 _optionA,
        uint8 _optionB
    ) external returns (euint32) {
        Proposal storage proposal = proposals[_proposalId];
        require(_optionA < proposal.optionCount && _optionB < proposal.optionCount, "Invalid option");

        euint32 diff = FHE.sub(tallies[_proposalId][_optionA], tallies[_proposalId][_optionB]);
        FHE.allowSender(diff);
        return diff;
    }

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator can cancel");
        require(proposal.voterCount == 0, "Cannot cancel after votes cast");
        require(!proposal.revealed, "Already revealed");
        require(proposal.optionCount > 0, "Proposal does not exist");

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

    // --- View functions ---

    function getMyVote(uint256 _proposalId) external view returns (euint32) {
        require(hasVoted[_proposalId][msg.sender], "Not voted");
        return userEncryptedVotes[_proposalId][msg.sender];
    }

    function getEncryptedTally(uint256 _proposalId, uint8 _optionIndex) external view returns (euint32) {
        return tallies[_proposalId][_optionIndex];
    }

    function getProposal(uint256 _proposalId)
        external view returns (
            address creator,
            string memory title,
            uint8 optionCount,
            uint256 deadline,
            uint256 quorum,
            uint256 voterCount,
            bool revealed,
            uint256 spaceId,
            bool spaceGated
        )
    {
        Proposal storage p = proposals[_proposalId];
        return (p.creator, p.title, p.optionCount, p.deadline, p.quorum, p.voterCount, p.revealed, p.spaceId, p.spaceGated);
    }

    /// @notice Returns all proposal IDs created under a specific Space
    function getProposalsBySpace(uint256 _spaceId) external view returns (uint256[] memory) {
        return spaceProposals[_spaceId];
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
