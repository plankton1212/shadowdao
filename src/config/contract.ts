// Wave 2: Space-gated voting. ShadowVote redeployed with spaceId + spaceGated in Proposal.
export const SHADOWVOTE_ADDRESS = '0x625b9b6cBd467E69b4981457e7235EBd2874EF86' as const;

export const SHADOWSPACE_ADDRESS = '0x2B2A4370c5f26cB109D04047e018E65ddf413c88' as const;

export const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';
export const etherscanTx = (hash: string) => `${ETHERSCAN_BASE}/tx/${hash}`;
export const etherscanAddress = (addr: string) => `${ETHERSCAN_BASE}/address/${addr}`;

export const CATEGORY_LABELS = ['DeFi', 'NFT', 'Infrastructure', 'Gaming', 'Privacy', 'L2', 'DAO Tooling', 'Social'] as const;

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

export const SHADOWVOTE_ABI = [
  {
    name: 'createProposal',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
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
    name: 'vote',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption',
        type: 'tuple' as const,
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
    name: 'revealResults',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'getProposal',
    type: 'function' as const,
    stateMutability: 'view' as const,
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
    name: 'hasUserVoted',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_user', type: 'address' as const },
    ],
    outputs: [{ name: '', type: 'bool' as const }],
  },
  {
    name: 'getEncryptedTally',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_optionIndex', type: 'uint8' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getUserProposals',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getUserVotes',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: '_user', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'getProposalCount',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'ProposalCreated',
    type: 'event' as const,
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
    name: 'VoteCast',
    type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'voter', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'getMyVote',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'cancelProposal',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [],
  },
  {
    name: 'extendDeadline',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_newDeadline', type: 'uint256' as const },
    ],
    outputs: [],
  },
  {
    name: 'ResultsRevealed',
    type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
    ],
  },
  {
    name: 'ProposalCancelled',
    type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'creator', type: 'address' as const, indexed: true },
    ],
  },
  {
    name: 'DeadlineExtended',
    type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
      { name: 'newDeadline', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    name: 'checkQuorumEncrypted',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedMaxTally',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_proposalId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getEncryptedDifferential',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      { name: '_optionA', type: 'uint8' as const },
      { name: '_optionB', type: 'uint8' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'getProposalsBySpace',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: '_spaceId', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'uint256[]' as const }],
  },
  {
    name: 'setShadowSpaceContract',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: '_shadowSpace', type: 'address' as const }],
    outputs: [],
  },
  {
    name: 'shadowSpaceContract',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
  },
  {
    name: 'owner',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
  },
] as const;
