// Wave 2: Space-gated voting. ShadowVote redeployed with spaceId + spaceGated in Proposal.
export const SHADOWVOTE_ADDRESS = '0x625b9b6cBd467E69b4981457e7235EBd2874EF86' as const;
export const SHADOWSPACE_ADDRESS = '0x2B2A4370c5f26cB109D04047e018E65ddf413c88' as const;

// Wave 3+: deployed on Ethereum Sepolia
export const SHADOWVOTEV2_ADDRESS = '0xD8037F77d1D5764f3639A6216a580Cd608fB7fAA' as `0x${string}`;
export const SHADOWTREASURY_ADDRESS = '0xc7E024c8259b4c0c9Cd3F5A7987E7E79ACf8b0db' as `0x${string}`;
export const SHADOWDELEGATE_ADDRESS = '0x2a896334a0B1263f397A45844a307D4cF90cb5f1' as `0x${string}`;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';
export const etherscanTx = (hash: string) => `${ETHERSCAN_BASE}/tx/${hash}`;
export const etherscanAddress = (addr: string) => `${ETHERSCAN_BASE}/address/${addr}`;

export const CATEGORY_LABELS = ['DeFi', 'NFT', 'Infrastructure', 'Gaming', 'Privacy', 'L2', 'DAO Tooling', 'Social'] as const;

// --- ShadowSpace ABI (Wave 2) ---
export const SHADOWSPACE_ABI = [
  {
    name: 'createSpace', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_name', type: 'string' as const },
      { name: '_description', type: 'string' as const },
      { name: '_category', type: 'uint8' as const },
      { name: '_isPublic', type: 'bool' as const },
      { name: '_defaultQuorum', type: 'uint256' as const },
      { name: '_initialMembers', type: 'address[]' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'joinSpace', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'addMember', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }, { name: '_member', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'removeMember', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }, { name: '_member', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'updateSpace', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }, { name: '_name', type: 'string' as const }, { name: '_description', type: 'string' as const }],
    outputs: [],
  },
  {
    name: 'getSpace', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [
      { name: 'creator', type: 'address' as const },
      { name: 'name', type: 'string' as const },
      { name: 'description', type: 'string' as const },
      { name: 'category', type: 'uint8' as const },
      { name: 'isPublic', type: 'bool' as const },
      { name: 'defaultQuorum', type: 'uint256' as const },
      { name: 'memberCount', type: 'uint256' as const },
      { name: 'proposalCount', type: 'uint256' as const },
      { name: 'active', type: 'bool' as const },
    ],
  },
  {
    name: 'getSpaceCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getMembers', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'address[]' as const }],
  },
  {
    name: 'getUserSpaces', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'isSpaceMember', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }, { name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'bool' as const }],
  },
  {
    name: 'leaveSpace', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'archiveSpace', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'setShadowVoteContract', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowVote', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'SpaceCreated', type: 'event' as const,
    inputs: [
      { name: 'spaceId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
      { name: 'name', type: 'string' as const, indexed: false },
      { name: 'description', type: 'string' as const, indexed: false },
      { name: 'category', type: 'uint8' as const, indexed: false },
      { name: 'isPublic', type: 'bool' as const, indexed: false },
      { name: 'defaultQuorum', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    name: 'MemberJoined', type: 'event' as const,
    inputs: [
      { name: 'spaceId', type: 'uint256' as const, indexed: true },
      { name: 'member', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'MemberRemoved', type: 'event' as const,
    inputs: [
      { name: 'spaceId', type: 'uint256' as const, indexed: true },
      { name: 'member', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'SpaceArchived', type: 'event' as const,
    inputs: [
      { name: 'spaceId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
    ],
  },
] as const;

// --- ShadowVote ABI (Wave 2, V1) ---
export const SHADOWVOTE_ABI = [
  {
    name: 'createProposal', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_title', type: 'string' as const },
      { name: '_optionCount', type: 'uint8' as const },
      { name: '_deadline', type: 'uint256' as const },
      { name: '_quorum', type: 'uint256' as const },
      { name: '_spaceId', type: 'uint256' as const },
      { name: '_spaceGated', type: 'bool' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'vote', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'revealResults', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'getProposal', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [
      { name: 'creator', type: 'address' as const },
      { name: 'title', type: 'string' as const },
      { name: 'optionCount', type: 'uint8' as const },
      { name: 'deadline', type: 'uint256' as const },
      { name: 'quorum', type: 'uint256' as const },
      { name: 'voterCount', type: 'uint256' as const },
      { name: 'revealed', type: 'bool' as const },
      { name: 'spaceId', type: 'uint256' as const },
      { name: 'spaceGated', type: 'bool' as const },
    ],
  },
  {
    name: 'hasUserVoted', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'bool' as const }],
  },
  {
    name: 'getEncryptedTally', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_optionIndex', type: 'uint8' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getUserProposals', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getUserVotes', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getProposalCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getMyVote', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'cancelProposal', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'extendDeadline', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_newDeadline', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'checkQuorumEncrypted', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedMaxTally', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedDifferential', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_optionA', type: 'uint8' as const },
      { name: '_optionB', type: 'uint8' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getProposalsBySpace', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'setShadowSpaceContract', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowSpace', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'shadowSpaceContract', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'address' as const }],
  },
  {
    name: 'owner', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'address' as const }],
  },
  {
    name: 'ProposalCreated', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
      { name: 'title', type: 'string' as const, indexed: false },
      { name: 'optionCount', type: 'uint8' as const, indexed: false },
      { name: 'deadline', type: 'uint256' as const, indexed: false },
      { name: 'quorum', type: 'uint256' as const, indexed: false },
      { name: 'spaceId', type: 'uint256' as const, indexed: false },
      { name: 'spaceGated', type: 'bool' as const, indexed: false },
    ],
  },
  {
    name: 'VoteCast', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'voter', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'ResultsRevealed', type: 'event' as const,
    inputs: [{ name: 'proposalId', type: 'uint256' as const, indexed: true }],
  },
  {
    name: 'ProposalCancelled', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'DeadlineExtended', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'newDeadline', type: 'uint256' as const, indexed: false },
    ],
  },
] as const;

// --- ShadowVoteV2 ABI (Wave 3+: weighted voting, IPFS desc, discussion, gasless) ---
export const SHADOWVOTEV2_ABI = [
  {
    name: 'createProposal', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_title', type: 'string' as const },
      { name: '_descriptionHash', type: 'bytes32' as const },
      { name: '_optionCount', type: 'uint8' as const },
      { name: '_deadline', type: 'uint256' as const },
      { name: '_quorum', type: 'uint256' as const },
      { name: '_weighted', type: 'bool' as const },
      { name: '_spaceId', type: 'uint256' as const },
      { name: '_spaceGated', type: 'bool' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'vote', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'voteWithSignature', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
      { name: '_nonce', type: 'uint256' as const },
      { name: 'v', type: 'uint8' as const },
      { name: 'r', type: 'bytes32' as const },
      { name: 's', type: 'bytes32' as const },
    ],
    outputs: [],
  },
  {
    name: 'revealResults', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'setVotingPower', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'voter', type: 'address' as const },
      {
        name: '_encryptedPower', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'getProposal', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [
      { name: 'creator', type: 'address' as const },
      { name: 'title', type: 'string' as const },
      { name: 'descriptionHash', type: 'bytes32' as const },
      { name: 'optionCount', type: 'uint8' as const },
      { name: 'deadline', type: 'uint256' as const },
      { name: 'quorum', type: 'uint256' as const },
      { name: 'voterCount', type: 'uint256' as const },
      { name: 'revealed', type: 'bool' as const },
      { name: 'weighted', type: 'bool' as const },
      { name: 'spaceId', type: 'uint256' as const },
      { name: 'spaceGated', type: 'bool' as const },
    ],
  },
  {
    name: 'postComment', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_ipfsHash', type: 'bytes32' as const },
    ],
    outputs: [],
  },
  {
    name: 'getComment', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: 'index', type: 'uint256' as const }],
    outputs: [
      { name: 'author', type: 'address' as const },
      { name: 'ipfsHash', type: 'bytes32' as const },
      { name: 'blockNumber', type: 'uint256' as const },
    ],
  },
  {
    name: 'getCommentCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'hasUserVoted', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'bool' as const }],
  },
  {
    name: 'getEncryptedTally', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_optionIndex', type: 'uint8' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getUserProposals', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getUserVotes', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getProposalCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getProposalsBySpace', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getMyVote', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'nonces', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'cancelProposal', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'extendDeadline', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }, { name: '_newDeadline', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'checkQuorumEncrypted', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedMaxTally', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedDifferential', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_optionA', type: 'uint8' as const },
      { name: '_optionB', type: 'uint8' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedVotingPower', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'voter', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'setShadowSpaceContract', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowSpace', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'ProposalCreated', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
      { name: 'title', type: 'string' as const, indexed: false },
      { name: 'descriptionHash', type: 'bytes32' as const, indexed: false },
      { name: 'optionCount', type: 'uint8' as const, indexed: false },
      { name: 'deadline', type: 'uint256' as const, indexed: false },
      { name: 'quorum', type: 'uint256' as const, indexed: false },
      { name: 'weighted', type: 'bool' as const, indexed: false },
      { name: 'spaceId', type: 'uint256' as const, indexed: false },
      { name: 'spaceGated', type: 'bool' as const, indexed: false },
    ],
  },
  {
    name: 'VoteCast', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'voter', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'MetaVoteCast', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'voter', type: 'address' as const, indexed: true },
      { name: 'relayer', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'CommentPosted', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'author', type: 'address' as const, indexed: true },
      { name: 'ipfsHash', type: 'bytes32' as const, indexed: false },
      { name: 'blockNumber', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    name: 'ResultsRevealed', type: 'event' as const,
    inputs: [{ name: 'proposalId', type: 'uint256' as const, indexed: true }],
  },
  {
    name: 'ProposalCancelled', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'DeadlineExtended', type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'newDeadline', type: 'uint256' as const, indexed: false },
    ],
  },
] as const;

// --- ShadowTreasury ABI (Wave 3) ---
export const SHADOWTREASURY_ABI = [
  {
    name: 'deposit', type: 'function' as const, stateMutability: 'payable' as const,
    inputs: [], outputs: [],
  },
  {
    name: 'withdraw', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'amountWei', type: 'uint256' as const },
      { name: 'to', type: 'address' as const },
    ],
    outputs: [],
  },
  {
    name: 'proposeAllocation', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const },
      { name: 'amountWei', type: 'uint256' as const },
      { name: 'recipient', type: 'address' as const },
    ],
    outputs: [],
  },
  {
    name: 'executeAllocation', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'allocationId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'cancelAllocation', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'allocationId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'getTreasuryBalance', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEthBalance', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getAllocation', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: 'allocationId', type: 'uint256' as const }],
    outputs: [
      { name: 'proposalId', type: 'uint256' as const },
      { name: 'amountWei', type: 'uint256' as const },
      { name: 'recipient', type: 'address' as const },
      { name: 'executed', type: 'bool' as const },
      { name: 'cancelled', type: 'bool' as const },
    ],
  },
  {
    name: 'allocationCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'UNIT', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'setShadowVoteContract', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowVote', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'Deposited', type: 'event' as const,
    inputs: [
      { name: 'from', type: 'address' as const, indexed: true },
      { name: 'amountWei', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    name: 'Withdrawn', type: 'event' as const,
    inputs: [
      { name: 'to', type: 'address' as const, indexed: true },
      { name: 'amountWei', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    name: 'AllocationProposed', type: 'event' as const,
    inputs: [
      { name: 'allocationId', type: 'uint256' as const, indexed: true },
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'amountWei', type: 'uint256' as const, indexed: false },
      { name: 'recipient', type: 'address' as const, indexed: false },
    ],
  },
  {
    name: 'AllocationExecuted', type: 'event' as const,
    inputs: [
      { name: 'allocationId', type: 'uint256' as const, indexed: true },
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
    ],
  },
] as const;

// --- ShadowDelegate ABI (Wave 4) ---
export const SHADOWDELEGATE_ABI = [
  {
    name: 'delegate', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'to', type: 'address' as const },
      {
        name: '_myPower', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'undelegate', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      {
        name: '_myPower', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'voteAsDelegate', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption', type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'getTopDelegates', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: 'limit', type: 'uint8' as const }],
    outputs: [
      { name: 'delegates', type: 'address[]' as const },
      { name: 'counts', type: 'uint256[]' as const },
    ],
  },
  {
    name: 'getDelegateOf', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: 'user', type: 'address' as const }],
    outputs: [{ name: '', type: 'address' as const }],
  },
  {
    name: 'getDelegators', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: 'delegate_', type: 'address' as const }],
    outputs: [{ name: '', type: 'address[]' as const }],
  },
  {
    name: 'getDelegatedPower', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'delegate_', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'delegationCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'delegatedTo', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '', type: 'address' as const }],
    outputs: [{ name: '', type: 'address' as const }],
  },
  {
    name: 'getDelegateCount', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [], outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'setShadowVoteContract', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowVote', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'Delegated', type: 'event' as const,
    inputs: [
      { name: 'from', type: 'address' as const, indexed: true },
      { name: 'to', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'Undelegated', type: 'event' as const,
    inputs: [
      { name: 'from', type: 'address' as const, indexed: true },
      { name: 'previousDelegate', type: 'address' as const, indexed: true },
    ],
  },
] as const;
