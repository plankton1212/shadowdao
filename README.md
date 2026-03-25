<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="ShadowDAO Logo" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center">
  <strong>Private on-chain DAO governance powered by Fhenix FHE</strong>
</p>

<p align="center">
  <a href="https://shadowdao.vercel.app">Live Demo</a> &middot;
  <a href="#the-problem">Problem</a> &middot;
  <a href="#how-fhenix-fhe-solves-this">Solution</a> &middot;
  <a href="#fhenix-integration-deep-dive">Fhenix Deep Dive</a> &middot;
  <a href="#roadmap">Roadmap</a>
</p>

---

## The Problem

**DAO voting today is broken by transparency.**

Every major governance platform — Snapshot, Tally, Governor — makes all votes fully public. Anyone can see who voted, what they chose, and how much power they used. This seems fair, but in practice it creates serious problems:

- **Voter coercion** — whales and protocol insiders pressure smaller holders to vote their way, because they can verify compliance on-chain
- **Frontrunning** — MEV bots and traders act on visible vote momentum before proposals close, manipulating outcomes for profit
- **Social pressure** — members vote with the majority instead of their conviction, because dissent is publicly visible and socially punished
- **Strategic last-minute voting** — participants wait until the final minutes to see which way the vote is leaning, then pile on — turning governance into a game of timing rather than genuine preference
- **Vote buying** — since votes are verifiable, bad actors can pay for specific outcomes and confirm delivery on-chain

These aren't theoretical risks. They happen every day across DeFi governance. The root cause is the same: **transparent voting forces participants to optimize for social and economic consequences rather than honest preference.**

**Who is affected:** Every DAO member, token holder, and protocol contributor who wants governance decisions to reflect genuine community sentiment rather than power dynamics.

---

## How Fhenix FHE Solves This

ShadowDAO uses **Fhenix CoFHE (Fully Homomorphic Encryption)** — a coprocessor that runs on top of standard EVM — to make votes **completely private** while keeping results **mathematically verifiable**.

The key insight: FHE allows the smart contract to perform arithmetic on encrypted data. The contract can add encrypted votes to encrypted tallies **without ever knowing what any individual voted for.** Only the final aggregate totals are decrypted after the deadline.

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOW IT WORKS                             │
│                                                                 │
│  Voter's Browser              Smart Contract         CoFHE      │
│  ───────────────              ──────────────         ─────      │
│                                                                 │
│  1. Choose option ──encrypt──> 2. Receive encrypted             │
│     (CoFHE SDK)                   vote (euint32)                │
│                                                                 │
│                                3. For each option:              │
│                                   FHE.eq(vote, i)   ──compute──│
│                                   FHE.select(match)  ──compute──│
│                                   FHE.add(tally)     ──compute──│
│                                                                 │
│                                4. After deadline:               │
│                                   FHE.allowPublic()  ──decrypt──│
│                                                                 │
│  5. Read totals  <──decrypt──  6. Return aggregate              │
│     (permit)                      counts only                   │
│                                                                 │
│  Individual votes remain encrypted FOREVER                      │
└─────────────────────────────────────────────────────────────────┘
```

**Nobody — not validators, not the DAO, not even the contract itself — can see individual votes. Ever.**

### What makes this different from Snapshot's "Shielded Voting"

Snapshot recently added optional shielded voting using threshold encryption. ShadowDAO is fundamentally different:

| | Snapshot | ShadowDAO |
|--|---------|-----------|
| Privacy | Optional add-on | **Default, mandatory** |
| Encryption | Threshold (reveals after voting ends) | **FHE (individual votes never revealed)** |
| Computation | Off-chain (IPFS) | **On-chain (EVM + CoFHE)** |
| Tallying | Decrypt all votes, count in cleartext | **Count on encrypted data, reveal only totals** |
| After reveal | All individual votes become public | **Only aggregates public, votes stay encrypted** |

---

## Key Features (Implemented)

### Fully Working End-to-End

| Feature | Description | FHE Used |
|---------|-------------|----------|
| **Create Proposal** | Title, options, deadline, quorum — deployed on-chain | `FHE.asEuint32(0)`, `FHE.allowThis` |
| **FHE-Encrypted Voting** | Vote encrypted in browser, ZK proof generated, submitted on-chain | `Encryptable.uint32`, `encryptInputs`, `FHE.eq`, `FHE.select`, `FHE.add` |
| **Time-Locked Results** | Nobody sees results until deadline passes | Tallies stored as `euint32` |
| **Permissionless Reveal** | Anyone can trigger reveal after deadline + quorum | `FHE.allowPublic` |
| **Verify My Vote** | Voter can privately decrypt their own ballot via FHE permit | `FHE.allowSender`, `decryptForView`, EIP-712 permit |
| **Result Decryption** | Tallies decrypted in browser with permit | `decryptForView`, `getOrCreateSelfPermit` |
| **DAO Spaces** | On-chain DAO registry with members, categories, join/leave | ShadowSpace.sol |
| **Admin Controls** | Creator can cancel (pre-vote) or extend deadline | On-chain access control |
| **Real-Time Notifications** | Live event feed from blockchain (ProposalCreated, VoteCast, ResultsRevealed) | `getLogs` |
| **Live Countdown** | Real-time HH:MM:SS timer on active proposals | — |

### What Cannot Work Without Fhenix FHE

These features are **impossible** without FHE. There is no plaintext fallback:

- **Voting** — ballot encrypted before on-chain submission
- **Tally accumulation** — `FHE.add` on encrypted counters
- **Vote verification** — `FHE.allowSender` + permit-based self-decrypt
- **Result reveal** — `FHE.allowPublic` to make aggregate decryptable
- **Treasury balance** (Wave 3) — `euint64` encrypted balance

### What Works Without FHE

- Creating proposals (title and options are public metadata)
- Reading proposal metadata (deadline, quorum, voter count)
- Checking `hasUserVoted` (public boolean — proves participation, not choice)

---

## Fhenix Integration Deep Dive

ShadowDAO uses **9 distinct FHE operations** across 2 smart contracts and 3 frontend hooks — one of the deepest Fhenix integrations in any hackathon project:

### Smart Contract — FHE Operations

```solidity
// ShadowVote.sol — 9 FHE operations

// 1. Initialize encrypted zero counters
euint32 zero = FHE.asEuint32(0);

// 2. Allow contract to operate on its own data
FHE.allowThis(zero);

// 3. Convert encrypted input from browser
euint32 option = FHE.asEuint32(_encryptedOption);

// 4. Encrypted equality check (does vote == option i?)
ebool isMatch = FHE.eq(option, FHE.asEuint32(i));

// 5. Encrypted conditional (if match: 1, else: 0)
euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));

// 6. Encrypted addition (add to tally without knowing value)
tallies[id][i] = FHE.add(tallies[id][i], increment);

// 7. Allow voter to decrypt their own vote
FHE.allowSender(userEncryptedVotes[id][msg.sender]);

// 8. Make aggregate tally publicly decryptable
FHE.allowPublic(tallies[id][i]);

// 9. Encrypted quorum check (is total votes >= quorum?)
ebool quorumMet = FHE.gte(totalEncrypted, quorumEncrypted);

// 10. Private winner detection (find max tally without revealing any)
euint32 maxTally = FHE.max(tallies[id][0], tallies[id][1]);

// 11. Encrypted vote differential (margin of victory)
euint32 diff = FHE.sub(tallies[id][0], tallies[id][1]);
```

### Frontend — CoFHE SDK Integration

```typescript
// useCofhe.ts — SDK initialization
const client = createCofheClient(config);
await client.connect(publicClient, walletClient);

// useVote.ts — encrypt vote in browser
const encrypted = await client.encryptInputs([Encryptable.uint32(optionIndex)]).execute();
// Sends {ctHash, securityZone, utype, signature} to contract

// useReveal.ts — decrypt revealed tallies
await client.permits.getOrCreateSelfPermit();  // EIP-712 signature
const result = await client.decryptForView(ctHash, FheTypes.Uint32).withPermit().execute();

// useVerifyVote.ts — voter verifies own encrypted ballot
const myVote = await client.decryptForView(myVoteHash, FheTypes.Uint32).withPermit().execute();
```

### FHE Data Flow

| Data | Type | Visibility | When Decrypted |
|------|------|-----------|---------------|
| Individual vote | `euint32` | **Never public** | Only by voter via permit |
| Option tallies | `euint32` | Encrypted until reveal | After `FHE.allowPublic()` |
| Has voted | `bool` | Public | Always (proves participation, not choice) |
| Treasury balance | `euint64` (Wave 3) | Encrypted | By DAO members via permit |

---

## Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **ShadowVote.sol** | [`0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5`](https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5) | FHE-encrypted voting with euint32 tallies |
| **ShadowSpace.sol** | [`0x136dB5145e9bD4F8DadCBA70BFa4BDE69a366EE5`](https://sepolia.etherscan.io/address/0x136dB5145e9bD4F8DadCBA70BFa4BDE69a366EE5) | On-chain DAO registry |

Network: Ethereum Sepolia (Chain ID: 11155111) | Solidity 0.8.25 (EVM: Cancun)

### ShadowVote.sol Functions

| Function | FHE | Description |
|----------|-----|-------------|
| `createProposal(title, optionCount, deadline, quorum)` | `asEuint32`, `allowThis` | Create proposal with encrypted tally counters |
| `vote(proposalId, encryptedOption)` | `asEuint32`, `eq`, `select`, `add`, `allowSender` | Cast FHE-encrypted vote |
| `revealResults(proposalId)` | `allowPublic` | Make tallies publicly decryptable |
| `checkQuorumEncrypted(proposalId)` | `gte`, `add`, `asEuint32` | Encrypted quorum validation without revealing vote count |
| `getEncryptedMaxTally(proposalId)` | `max` | Find winning option without revealing any tallies |
| `getEncryptedDifferential(proposalId, a, b)` | `sub` | Encrypted margin of victory between two options |
| `getMyVote(proposalId)` | Permit-gated | Return voter's own encrypted ballot |
| `cancelProposal(proposalId)` | — | Creator cancels if no votes cast |
| `extendDeadline(proposalId, newDeadline)` | — | Creator extends voting period |

### ShadowSpace.sol Functions

| Function | Description |
|----------|-------------|
| `createSpace(name, desc, category, isPublic, quorum, members[])` | Deploy on-chain DAO |
| `joinSpace(spaceId)` | Join open Space |
| `addMember / removeMember` | Creator manages members |
| `updateSpace` | Creator edits metadata |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| FHE Engine | **Fhenix CoFHE** coprocessor | FHE operations on top of standard EVM |
| FHE SDK | **@cofhe/sdk 0.4.0** | Browser-side encryption, ZK proofs, permits |
| Contracts | **@fhenixprotocol/cofhe-contracts 0.1.0** | Solidity FHE types (euint32, ebool, InEuint32) |
| Frontend | React 19 + TypeScript + Vite 6 | Modern SPA |
| Styling | Tailwind CSS 4 + Motion 12 | Animations, responsive |
| Wallet | wagmi 3 + viem 2 | MetaMask, Sepolia |
| State | Zustand 5 | UI-only state, no data persistence |
| Build | Hardhat + @cofhe/hardhat-plugin | Compile + deploy |
| Deploy | Vercel | COOP/COEP headers for WASM |

---

## Expected User Experience

**1. Connect** — User connects MetaMask on Sepolia

**2. Browse** — Dashboard shows active proposals from blockchain, live notifications

**3. Create** — 4-step wizard: title → options (with templates) → duration/quorum → deploy. Transaction confirmed on-chain, voting link generated

**4. Vote** — Select option → "Encrypt & Submit" → FHE encryption in browser (~9 sec) → ZK proof → on-chain submission. Progress shown: Initializing → Encrypting → Submitting → Confirming

**5. Verify** — After voting, "Verify My Vote (FHE Decrypt)" button. Signs EIP-712 permit → decrypts own ballot → shows "You voted: Option 1" (only visible to voter)

**6. Wait** — Live countdown timer. Nobody sees results. No intermediate tallies.

**7. Reveal** — After deadline + quorum met, anyone clicks "Reveal Results" → `FHE.allowPublic()` → tallies decrypted → animated bar charts with winner badge

**All data from blockchain. No backend, no database, no localStorage.**

---

## Getting Started

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
npm run dev
```

Requirements: Node.js 18+, MetaMask with Sepolia ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

---

## Security

- FHE is mandatory for voting — no plaintext fallback exists
- COOP/COEP headers use `credentialless` (not `require-corp`) to avoid breaking MetaMask
- All user input validated and sanitized
- Contract enforces: single vote per address, deadline checks, quorum requirements, creator-only admin

---

## License

MIT
