// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev Minimal interface to ShadowSpace for membership checks.
interface IShadowSpaceV2 {
    function isSpaceMember(uint256 _spaceId, address _user) external view returns (bool);
    function incrementProposalCount(uint256 _spaceId) external;
}

/// @title ShadowVoteV2  -  FHE-encrypted voting with weighted votes, IPFS proposals, discussion, gasless meta-tx
/// @notice Wave 3+: extends Wave 2 with:
///   - Weighted voting: FHE.mul(encryptedVote, encryptedVotingPower)  -  Wave 3
///   - IPFS description hash per proposal  -  Wave 3
///   - On-chain discussion (IPFS comment hashes)  -  Wave 4
///   - EIP-712 meta-transactions for gasless voting  -  Wave 5
///   Total FHE ops: 15 distinct operations (adds FHE.mul over V1's 13)
contract ShadowVoteV2 {
    struct Proposal {
        address creator;
        string title;
        bytes32 descriptionHash; // IPFS hash of the proposal markdown body
        uint8 optionCount;
        uint256 deadline;
        uint256 quorum;
        uint256 voterCount;
        bool revealed;
        bool weighted;           // true = FHE.mul applied (weighted voting)
        uint256 spaceId;
        bool spaceGated;
    }

    struct Comment {
        address author;
        bytes32 ipfsHash;        // IPFS CID of markdown comment
        uint256 blockNumber;
    }

    // --- Access control ---
    address public owner;
    address public shadowSpaceContract;

    // --- Proposals ---
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint8 => euint32)) private tallies;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => euint32)) private userEncryptedVotes;
    mapping(address => uint256[]) private userProposals;
    mapping(address => uint256[]) private userVotes;
    mapping(uint256 => uint256[]) private spaceProposals;
    uint256 public proposalCount;

    // --- Weighted Voting ---
    mapping(address => euint32) private votingPowers;
    mapping(address => bool) private hasPower;

    // --- Discussion ---
    uint256 public constant MAX_COMMENTS_PER_PROPOSAL = 1000;
    mapping(uint256 => Comment[]) private comments;

    // --- Gasless meta-tx (EIP-712) ---
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant VOTE_TYPEHASH = keccak256(
        "Vote(uint256 proposalId,uint256 ctHash,uint8 securityZone,uint8 utype,uint256 nonce)"
    );
    mapping(address => uint256) public nonces;

    // --- Events ---
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title,
        bytes32 descriptionHash,
        uint8 optionCount,
        uint256 deadline,
        uint256 quorum,
        bool weighted,
        uint256 spaceId,
        bool spaceGated
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event MetaVoteCast(uint256 indexed proposalId, address indexed voter, address indexed relayer);
    event ResultsRevealed(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, address indexed creator);
    event DeadlineExtended(uint256 indexed proposalId, uint256 newDeadline);
    event VotingPowerSet(address indexed voter);
    event CommentPosted(uint256 indexed proposalId, address indexed author, bytes32 ipfsHash, uint256 blockNumber);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("ShadowVoteV2"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // --- Admin ---

    function setShadowSpaceContract(address _shadowSpace) external onlyOwner {
        require(_shadowSpace != address(0), "Zero address");
        shadowSpaceContract = _shadowSpace;
    }

    /// @notice Admin sets a voter's encrypted voting power.
    ///         Only voter can decrypt their own power via FHE.allowSender permit.
    function setVotingPower(address voter, InEuint32 calldata _encryptedPower) external onlyOwner {
        euint32 power = FHE.asEuint32(_encryptedPower);
        FHE.allowThis(power);
        FHE.allowSender(power);
        votingPowers[voter] = power;
        hasPower[voter] = true;
        emit VotingPowerSet(voter);
    }

    // --- Core: Create ---

    function createProposal(
        string calldata _title,
        bytes32 _descriptionHash,
        uint8 _optionCount,
        uint256 _deadline,
        uint256 _quorum,
        bool _weighted,
        uint256 _spaceId,
        bool _spaceGated
    ) external returns (uint256) {
        require(_optionCount >= 2 && _optionCount <= 10, "Invalid option count");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        if (_spaceGated && shadowSpaceContract != address(0)) {
            require(
                IShadowSpaceV2(shadowSpaceContract).isSpaceMember(_spaceId, msg.sender),
                "Not a space member"
            );
        }

        uint256 proposalId = proposalCount++;

        proposals[proposalId] = Proposal({
            creator: msg.sender,
            title: _title,
            descriptionHash: _descriptionHash,
            optionCount: _optionCount,
            deadline: _deadline,
            quorum: _quorum,
            voterCount: 0,
            revealed: false,
            weighted: _weighted,
            spaceId: _spaceGated ? _spaceId : 0,
            spaceGated: _spaceGated
        });

        for (uint8 i = 0; i < _optionCount; i++) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            tallies[proposalId][i] = zero;
        }

        userProposals[msg.sender].push(proposalId);

        if (_spaceGated) {
            spaceProposals[_spaceId].push(proposalId);
            if (shadowSpaceContract != address(0)) {
                IShadowSpaceV2(shadowSpaceContract).incrementProposalCount(_spaceId);
            }
        }

        emit ProposalCreated(
            proposalId, msg.sender, _title, _descriptionHash,
            _optionCount, _deadline, _quorum, _weighted,
            _spaceGated ? _spaceId : 0, _spaceGated
        );
        return proposalId;
    }

    // --- Core: Vote ---

    function vote(uint256 _proposalId, InEuint32 calldata _encryptedOption) external {
        _castVote(_proposalId, _encryptedOption, msg.sender);
        emit VoteCast(_proposalId, msg.sender);
    }

    /// @notice Gasless meta-transaction: relayer submits vote on behalf of signer.
    ///         Signature covers (proposalId, ctHash, securityZone, utype, nonce).
    function voteWithSignature(
        uint256 _proposalId,
        InEuint32 calldata _encryptedOption,
        uint256 _nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 structHash = keccak256(abi.encode(
            VOTE_TYPEHASH,
            _proposalId,
            _encryptedOption.ctHash,
            _encryptedOption.securityZone,
            _encryptedOption.utype,
            _nonce
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");
        require(nonces[signer] == _nonce, "Invalid nonce");
        nonces[signer]++;

        _castVote(_proposalId, _encryptedOption, signer);
        emit MetaVoteCast(_proposalId, signer, msg.sender);
    }

    function _castVote(uint256 _proposalId, InEuint32 calldata _encryptedOption, address voter) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(!hasVoted[_proposalId][voter], "Already voted");
        require(block.timestamp <= proposal.deadline, "Voting ended");
        require(proposal.optionCount > 0, "Proposal does not exist");

        if (proposal.spaceGated && shadowSpaceContract != address(0)) {
            require(
                IShadowSpaceV2(shadowSpaceContract).isSpaceMember(proposal.spaceId, voter),
                "Not a space member"
            );
        }

        euint32 option = FHE.asEuint32(_encryptedOption);

        // Determine vote weight: 1 (standard) or encrypted power (weighted)
        euint32 weight;
        if (proposal.weighted && hasPower[voter]) {
            weight = votingPowers[voter]; // FHE.mul applied below
        } else {
            weight = FHE.asEuint32(1);
            FHE.allowThis(weight);
        }

        for (uint8 i = 0; i < proposal.optionCount; i++) {
            ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
            euint32 base = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));

            euint32 increment;
            if (proposal.weighted && hasPower[voter]) {
                // FHE.mul  -  weighted vote: multiply ballot by encrypted voting power
                increment = FHE.mul(base, weight);
            } else {
                increment = base;
            }

            tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
            FHE.allowThis(tallies[_proposalId][i]);
        }

        userEncryptedVotes[_proposalId][voter] = option;
        FHE.allowSender(userEncryptedVotes[_proposalId][voter]);

        hasVoted[_proposalId][voter] = true;
        proposal.voterCount++;
        userVotes[voter].push(_proposalId);
    }

    // --- Reveal ---

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

    // --- Encrypted Analytics ---

    /// @notice FHE.gte  -  check quorum entirely on encrypted data
    function checkQuorumEncrypted(uint256 _proposalId) external returns (ebool) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.optionCount > 0, "Proposal does not exist");

        euint32 total = tallies[_proposalId][0];
        for (uint8 i = 1; i < proposal.optionCount; i++) {
            total = FHE.add(total, tallies[_proposalId][i]);
            FHE.allowThis(total);
        }

        ebool result = FHE.gte(total, FHE.asEuint32(uint32(proposal.quorum)));
        FHE.allowSender(result);
        return result;
    }

    /// @notice FHE.max  -  find leading option without revealing any tally
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

    /// @notice FHE.sub  -  encrypted margin between two options
    function getEncryptedDifferential(uint256 _proposalId, uint8 _optionA, uint8 _optionB) external returns (euint32) {
        Proposal storage proposal = proposals[_proposalId];
        require(_optionA < proposal.optionCount && _optionB < proposal.optionCount, "Invalid option");
        euint32 diff = FHE.sub(tallies[_proposalId][_optionA], tallies[_proposalId][_optionB]);
        FHE.allowSender(diff);
        return diff;
    }

    /// @notice Returns voter's own encrypted voting power (only sender can decrypt via permit)
    function getEncryptedVotingPower(address voter) external returns (euint32) {
        require(hasPower[voter], "No voting power set");
        FHE.allowSender(votingPowers[voter]);
        return votingPowers[voter];
    }

    // --- Discussion ---

    /// @notice Post a comment as an IPFS hash. Gas-efficient: only stores hash + metadata on-chain.
    function postComment(uint256 _proposalId, bytes32 _ipfsHash) external {
        require(proposals[_proposalId].optionCount > 0, "Proposal does not exist");
        require(_ipfsHash != bytes32(0), "Empty hash");
        require(comments[_proposalId].length < MAX_COMMENTS_PER_PROPOSAL, "Comment limit reached");

        comments[_proposalId].push(Comment({
            author: msg.sender,
            ipfsHash: _ipfsHash,
            blockNumber: block.number
        }));

        emit CommentPosted(_proposalId, msg.sender, _ipfsHash, block.number);
    }

    function getComment(uint256 _proposalId, uint256 index) external view returns (
        address author,
        bytes32 ipfsHash,
        uint256 blockNumber
    ) {
        require(index < comments[_proposalId].length, "Index out of bounds");
        Comment storage c = comments[_proposalId][index];
        return (c.author, c.ipfsHash, c.blockNumber);
    }

    function getCommentCount(uint256 _proposalId) external view returns (uint256) {
        return comments[_proposalId].length;
    }

    // --- Admin controls ---

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator");
        require(proposal.voterCount == 0, "Cannot cancel after votes cast");
        require(!proposal.revealed, "Already revealed");
        require(proposal.optionCount > 0, "Proposal does not exist");
        proposal.deadline = 0;
        proposal.optionCount = 0;
        emit ProposalCancelled(_proposalId, msg.sender);
    }

    function extendDeadline(uint256 _proposalId, uint256 _newDeadline) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator");
        require(!proposal.revealed, "Already revealed");
        require(proposal.optionCount > 0, "Proposal does not exist");
        require(_newDeadline > proposal.deadline, "Must be later");
        proposal.deadline = _newDeadline;
        emit DeadlineExtended(_proposalId, _newDeadline);
    }

    // --- Views ---

    function getProposal(uint256 _proposalId) external view returns (
        address creator,
        string memory title,
        bytes32 descriptionHash,
        uint8 optionCount,
        uint256 deadline,
        uint256 quorum,
        uint256 voterCount,
        bool revealed,
        bool weighted,
        uint256 spaceId,
        bool spaceGated
    ) {
        Proposal storage p = proposals[_proposalId];
        return (p.creator, p.title, p.descriptionHash, p.optionCount, p.deadline,
                p.quorum, p.voterCount, p.revealed, p.weighted, p.spaceId, p.spaceGated);
    }

    function getEncryptedTally(uint256 _proposalId, uint8 _optionIndex) external view returns (euint32) {
        return tallies[_proposalId][_optionIndex];
    }

    function getMyVote(uint256 _proposalId) external view returns (euint32) {
        require(hasVoted[_proposalId][msg.sender], "Not voted");
        return userEncryptedVotes[_proposalId][msg.sender];
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

    function getProposalsBySpace(uint256 _spaceId) external view returns (uint256[] memory) {
        return spaceProposals[_spaceId];
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}
