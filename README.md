<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="ShadowDAO Logo" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center">
  <strong>Private on-chain governance powered by Fully Homomorphic Encryption</strong>
</p>

<p align="center">
  <a href="https://shadowdao-five.vercel.app">Live Demo</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#fhenix-integration">Fhenix FHE</a> &middot;
  <a href="#roadmap">Roadmap</a>
</p>

---

## The Problem

Traditional DAO voting (Snapshot, Governor, Tally) is **fully transparent** — everyone sees who voted for what. This creates:

- **Voter coercion** — whales pressure smaller holders
- **Frontrunning** — MEV bots and insiders act on visible vote momentum
- **Social pressure** — members vote with the crowd instead of their conviction
- **Strategic voting** — last-minute swing votes based on visible tallies

## The Solution

ShadowDAO uses **Fhenix FHE (Fully Homomorphic Encryption)** to make votes completely private while keeping results verifiable. Individual votes are encrypted before touching the chain, tallied while still encrypted, and only the final aggregate is ever revealed.

**Nobody — not validators, not the DAO, not even the contract itself — can see individual votes.**

---

## How It Works

### Architecture

```
Browser (React + wagmi)          Ethereum Sepolia          Fhenix CoFHE
                                                           (coprocessor)
  CoFHE SDK  ──── encrypt ────>  ShadowVote.sol  ── FHE ops ──>  TFHE Engine
             <── decrypt ──────  (euint32 tallies) <── results ──  (encrypted math)
```

ShadowDAO runs on **Ethereum Sepolia** with the **Fhenix CoFHE coprocessor**. CoFHE is not a separate chain — it's a coprocessor that handles FHE operations on top of standard EVM. The blockchain is the only source of truth. There is no backend, no database, no local storage.

### Voting Lifecycle

**1. Create Proposal (public, no FHE needed)**

Anyone can create a governance proposal with a title, voting options, deadline, and quorum threshold. The contract initializes an encrypted counter (`euint32`) for each option, starting at zero:

```solidity
euint32 zero = FHE.asEuint32(0);   // encrypted zero
FHE.allowThis(zero);                // contract can operate on it
tallies[proposalId][i] = zero;
```

**2. Cast Vote (FHE encryption mandatory)**

The voter's choice is encrypted in the browser using the CoFHE SDK before being sent on-chain:

```
Browser: Encryptable.uint32(optionIndex)
       -> encryptInputs() -> ZK proof generation
       -> {ctHash, securityZone, utype, signature}
       -> writeContract("vote", proposalId, encryptedTuple)
```

The contract receives the encrypted vote and updates every option's tally — without knowing the vote's value:

```solidity
euint32 option = FHE.asEuint32(_encryptedOption);
for (uint8 i = 0; i < optionCount; i++) {
    ebool isMatch = FHE.eq(option, FHE.asEuint32(i));        // encrypted comparison
    euint32 increment = FHE.select(isMatch, 1, 0);            // encrypted conditional
    tallies[id][i] = FHE.add(tallies[id][i], increment);      // encrypted addition
}
```

`FHE.eq`, `FHE.select`, `FHE.add` — all operate on **encrypted data**. The contract computes the correct tally without ever decrypting any individual vote.

**3. Wait for Deadline**

While voting is active:
- Votes are accepted
- All tallies remain encrypted
- Nobody can see intermediate results — not even the proposal creator

**4. Reveal Results (public aggregate only)**

After the deadline passes and quorum is met, anyone can trigger the reveal:

```solidity
for (uint8 i = 0; i < optionCount; i++) {
    FHE.allowPublic(tallies[id][i]);   // allow public decryption of aggregate
}
proposal.revealed = true;
```

`FHE.allowPublic` tells the CoFHE coprocessor to make the encrypted counter publicly decryptable. The frontend then reads and decrypts each tally:

```typescript
const ctHash = readContract("getEncryptedTally", proposalId, i);
const count = await cofheClient.decryptForView(ctHash, FheTypes.Uint32);
// count.decryptedValue = 42
```

**Individual votes remain encrypted forever. Only the totals are revealed.**

---

## Fhenix Integration

ShadowDAO uses Fhenix at every layer:

### Smart Contract Layer

| FHE Operation | Where Used | Purpose |
|---------------|-----------|---------|
| `FHE.asEuint32(0)` | `createProposal()` | Initialize encrypted tally counters |
| `FHE.asEuint32(input)` | `vote()` | Convert encrypted vote input to FHE type |
| `FHE.eq(a, b)` | `vote()` | Compare encrypted vote to each option index |
| `FHE.select(cond, a, b)` | `vote()` | Conditionally select 1 or 0 based on match |
| `FHE.add(a, b)` | `vote()` | Add to encrypted tally without decrypting |
| `FHE.allowThis(val)` | `createProposal()`, `vote()` | Allow contract to operate on the value |
| `FHE.allowPublic(val)` | `revealResults()` | Make aggregate tally publicly decryptable |

### Frontend SDK Layer

| SDK Function | Where Used | Purpose |
|-------------|-----------|---------|
| `createCofheClient()` | `useCofhe` hook | Initialize TFHE engine + worker threads |
| `Encryptable.uint32()` | `useVote` hook | Create encryptable vote value |
| `client.encryptInputs()` | `useVote` hook | Encrypt + generate ZK proof |
| `client.decryptForView()` | `useReveal` hook | Decrypt revealed tally for display |
| `client.getOrCreateSelfPermit()` | `useReveal` hook | EIP-712 permit for decryption |

### What Cannot Work Without FHE

- Voting (encryption is mandatory — no plaintext fallback)
- Reading tallies (encrypted until revealed)
- Treasury balance (Wave 3 — `euint64`)

### What Works Without FHE

- Creating proposals (title and options are public)
- Reading proposal metadata
- Checking `hasUserVoted` (public boolean)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Animations | Motion (Framer Motion) 12 |
| State | Zustand 5 (UI state only, no data persistence) |
| Wallet | wagmi 3 + viem 2 |
| FHE SDK | @cofhe/sdk 0.4.0 |
| Smart Contracts | Solidity 0.8.25 + @fhenixprotocol/cofhe-contracts 0.1.0 |
| Build Tool | Hardhat + @cofhe/hardhat-plugin |
| Network | Ethereum Sepolia (Chain ID: 11155111) |
| Deployment | Vercel (SPA + COOP/COEP headers for WASM) |

---

## Contract

**ShadowVote.sol** — deployed on Sepolia

| Address | `0x24f1141FA47fFDeb7d4870d6Bd6e4490F3755Fcc` |
|---------|-----------------------------------------------|
| Network | Ethereum Sepolia (Chain ID: 11155111) |
| Solidity | 0.8.25 (EVM: Cancun) |

### Functions

| Function | Access | Description |
|----------|--------|------------|
| `createProposal(title, optionCount, deadline, quorum)` | Anyone | Create a new governance proposal |
| `vote(proposalId, encryptedOption)` | Anyone (once) | Cast an FHE-encrypted vote |
| `revealResults(proposalId)` | Anyone (after deadline) | Make tallies publicly decryptable |
| `getProposal(id)` | View | Read proposal metadata |
| `getProposalCount()` | View | Total number of proposals |
| `hasUserVoted(id, user)` | View | Check if address has voted |
| `getEncryptedTally(id, optionIndex)` | View | Get encrypted tally handle |
| `getUserProposals(user)` | View | Proposals created by address |
| `getUserVotes(user)` | View | Proposals address voted on |

### Events

| Event | Indexed Fields |
|-------|---------------|
| `ProposalCreated` | proposalId, creator |
| `VoteCast` | proposalId, voter |
| `ResultsRevealed` | proposalId |

---

## Project Structure

```
shadowdao/
  contracts/
    ShadowVote.sol            # Core voting contract with FHE
  scripts/
    deploy.cts                # Hardhat deploy script
  src/
    components/
      UI.tsx                  # Design system (Button, Card, Badge, Navbar, etc.)
    config/
      contract.ts             # Contract address + ABI
      wagmi.ts                # wagmi config (Sepolia, MetaMask)
    hooks/
      useCofhe.ts             # CoFHE SDK singleton (encrypt, decrypt, permit)
      useCreateProposal.ts    # Create proposal transaction
      useProposals.ts         # Fetch all proposals from chain
      useReveal.ts            # Reveal results + decrypt tallies
      useVote.ts              # FHE encrypt + vote transaction
    pages/
      Home.tsx                # Landing page
      Dashboard.tsx           # App dashboard with stats
      Proposals.tsx           # Proposal list with filters
      ProposalDetail.tsx      # Vote casting + result display
      CreateProposal.tsx      # 4-step proposal wizard
      Treasury.tsx            # Treasury management (Wave 3)
      Settings.tsx            # Wallet + FHE permits
      HowItWorks.tsx          # Technical explainer
      Features.tsx            # Protocol features
    store/
      useStore.ts             # Zustand (UI state only)
    utils/
      index.ts                # cn(), formatAddress(), formatNumber()
    App.tsx                   # Routes + protected app shell
    main.tsx                  # Entry point
  hardhat.config.cts          # Hardhat + CoFHE plugin
  vite.config.ts              # Vite + Tailwind + COOP/COEP headers
  vercel.json                 # SPA routing + security headers
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask with Sepolia ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

### Install

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

### Deploy Contract (optional)

```bash
cp .env.example .env
# Add your PRIVATE_KEY and SEPOLIA_RPC_URL to .env

npm run compile
npm run deploy
# Update the address in src/config/contract.ts
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## Data Flow

All data comes from the blockchain. No localStorage, no backend, no cache.

| Data | Source |
|------|--------|
| Proposals list | `getProposalCount()` + `getProposal(i)` |
| Voter count | `getProposal(id).voterCount` |
| Has voted | `hasUserVoted(id, address)` |
| Tallies (after reveal) | `getEncryptedTally(id, i)` + `decryptForView` |
| My proposals | `getUserProposals(address)` |
| My votes | `getUserVotes(address)` |
| Notifications | `getLogs` for VoteCast, ResultsRevealed |
| Wallet address | `useAccount()` from wagmi |
| Network status | Real RPC ping via `getBlockNumber()` |

---

## Roadmap

### Wave 1 (Current)

- ShadowVote.sol deployed on Sepolia with euint32, FHE.add, FHE.select, FHE.allowPublic
- CoFHE SDK — full encryption pipeline (initTfhe -> encrypt -> prove -> verify)
- FHE encryption for vote casting (~9 seconds, Encryptable.uint32)
- Permit-based result decryption (decryptForView after reveal)
- wagmi wallet connection with MetaMask, Sepolia chain enforcement
- createProposal -> real transaction with on-chain title, options, description
- vote -> FHE-encrypted ballot -> real transaction (no plaintext fallback)
- revealResults -> FHE.allowPublic -> decrypted tallies with animated bars
- hasUserVoted on-chain check, double-vote prevention
- Transaction receipt waiting for all write operations
- 9 app pages — 100% on-chain data, zero localStorage
- Vercel deployment with COOP/COEP headers for WASM support

### Wave 2 (Planned)

- TFHE WASM SharedArrayBuffer fallback — single-threaded mode when headers unavailable
- Verify My Vote — permit-based self-decryption of own encrypted ballot
- Real-time event subscriptions — Toast notifications on VoteCast, ProposalCreated, ResultsRevealed
- Auto-reveal detection — live countdown timer, automatic VOTING -> ENDED transition
- Animated result reveal — counting animation, winner highlight with glow effect
- Network status indicator — real RPC ping with block number tooltip
- Proposal search, sort (newest/deadline/votes), "My Proposals" filter
- Multiple active proposals simultaneously with proper status management

### Wave 3 (Planned)

- ShadowTreasury.sol deployed with euint64 encrypted balance
- Deposit ETH — payable function, FHE.add to encrypted running total
- Propose allocation — linked to ShadowVote proposal for approval
- Execute allocation — FHE.gte solvency check, transfer after vote passes
- Permit-based balance reveal — eye toggle on Treasury dashboard
- Allocation lifecycle — awaiting vote -> ready to reveal -> ready to execute -> completed
- Treasury dashboard page connected to real on-chain data
- The Graph subgraph for ProposalCreated, VoteCast, ResultsRevealed event indexing

### Wave 4 (Planned)

- Quorum enforcement — FAILED status when deadline passes without quorum
- Vote delegation — delegateVote() function, delegate votes on behalf
- Proposal categories — Governance, Treasury, Technical, Community with filter chips
- On-chain audit trail — chronological event timeline per proposal with Etherscan links
- Analytics dashboard — participation rate, quorum achievement %, voting history from getLogs
- Multi-sig proposal creation — require N-of-M signatures to create
- Encrypted governance report — aggregate stats without revealing individual votes

### Wave 5 (Planned)

- Multi-chain — deploy on Arbitrum Sepolia, chain selector in AppTopBar
- Gasless voting via ERC-2771 meta-transactions + Gelato Relay
- Governance SDK (@shadowdao/sdk) with typed hooks and ShadowDAOProvider
- Mobile responsive polish — all pages at 375-428px, 48px touch targets
- Security review — reentrancy, FHE security zones, access control, input sanitization
- Demo video — full create -> vote -> reveal cycle with FHE encryption steps
- Architecture diagram and deployment documentation

---

## Security

- Private keys stored only in `.env` (gitignored)
- No sensitive data in console output
- COOP/COEP headers use `credentialless` (not `require-corp`) to avoid breaking MetaMask
- All user input validated and sanitized
- FHE is mandatory for voting — no plaintext fallback
- Contract enforces: single vote per address, deadline checks, quorum requirements

---

## License

MIT
