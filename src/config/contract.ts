// Update this address after deploying ShadowVote.sol to Sepolia
export const SHADOWVOTE_ADDRESS = '0x24f1141FA47fFDeb7d4870d6Bd6e4490F3755Fcc' as const;

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
    name: 'ResultsRevealed',
    type: 'event' as const,
    inputs: [
      { name: 'proposalId', type: 'uint256' as const, indexed: true },
    ],
  },
] as const;
