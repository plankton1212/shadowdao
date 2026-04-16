<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="ShadowDAO Logo" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center">
  Private on-chain DAO governance powered by Fhenix FHE
</p>

<p align="center">
  <a href="https://shadowdao.vercel.app">Live Demo</a> · <a href="https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5">Contract on Etherscan</a> · <a href="https://cofhe-docs.fhenix.zone">Fhenix Docs</a>
</p>

---

## What it does

Ever voted in a DAO and felt like you were being watched? That's because you were. Every Snapshot vote, every Governor ballot — it's all public. Everyone sees what you picked.

ShadowDAO fixes that. You vote, your ballot gets FHE-encrypted right in the browser before it even hits the chain. The smart contract counts votes *on the ciphertext* — it literally adds numbers it can't read. When the deadline passes and quorum is met, anyone can trigger the reveal. But here's the thing: only the totals get decrypted. Your individual vote stays encrypted forever.

The flow is simple: pick an option → CoFHE SDK encrypts it as `euint32` → ZK proof gets generated → the encrypted tuple goes on-chain → the contract runs `FHE.eq` + `FHE.select` + `FHE.add` for each option to tally without seeing anything → after the deadline, `FHE.allowPublic` makes the aggregate readable.

And if you're paranoid (fair), there's a "Verify My Vote" button. It uses `FHE.allowSender` so only *you* can decrypt *your own* ballot. Nobody else.

**Wave 2 features are live:** full Spaces navigation (My Spaces / Explore tabs), Leave Space + Archive Space, personal Dashboard stats, FHE step visualizer during voting, confetti on vote success, and ShadowSpace.sol upgraded with ACL fixes and lifecycle management.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VOTE LIFECYCLE                               │
│                                                                  │
│  Browser                    Contract               CoFHE         │
│  ───────                    ────────               ─────         │
│                                                                  │
│  1. Pick option                                                  │
│  2. Encryptable.uint32() ──>  3. FHE.asEuint32()                │
│     + ZK proof                                                   │
│                               4. for each option i:              │
│                                  FHE.eq(vote, i)   ── compute ──│
│                                  FHE.select(match)  ── compute ──│
│                                  FHE.add(tally, inc)── compute ──│
│                                                                  │
│                               5. Store encrypted                 │
│                                  ballot for voter                │
│                                  FHE.allowSender()               │
│                                                                  │
│         ═══ DEADLINE PASSES ═══                                  │
│                                                                  │
│                               6. FHE.allowPublic()  ── unlock ──│
│                                                                  │
│  7. decryptForView() <────── 8. Return aggregate                │
│     with EIP-712 permit         counts only                      │
│                                                                  │
│  Individual votes stay encrypted. Forever. No exceptions.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## The problem it solves

DAO governance has a transparency problem that nobody talks about honestly.

When votes are public, whales can pressure smaller holders — "vote my way, I can check." Traders frontrun visible vote momentum. People vote with the majority because disagreeing publicly has social costs. Last-minute pile-ons turn governance into a timing game. And vote buying? Trivially verifiable when everything is on-chain.

These aren't edge cases. They happen every day across DeFi. Uniswap, Aave, Compound — every governance vote is fully visible. The root cause is always the same: **transparent voting forces participants to optimize for consequences rather than honest preference.**

Snapshot added "shielded voting" recently, but it uses threshold encryption — after the vote ends, all individual votes get decrypted and become public. That's not privacy. That's delayed transparency.

ShadowDAO is different because individual votes are never decrypted. Not after the vote. Not ever. The contract performs arithmetic on encrypted data through Fhenix's CoFHE coprocessor. It knows the totals because it computed them homomorphically. But it never knew any individual ballot.

### ShadowDAO vs Snapshot

|  | Snapshot | ShadowDAO |
|--|---------|-----------|
| Privacy | Optional add-on ("Shielded") | **Mandatory, default** |
| Encryption | Threshold — reveals all votes after deadline | **FHE — individual votes never revealed** |
| Where votes live | Off-chain (IPFS) | **On-chain (Ethereum + CoFHE)** |
| Tallying | Decrypt everything, count in cleartext | **Count on ciphertext, reveal only totals** |
| After reveal | Every single vote becomes public | **Only aggregates public** |
| Voter verification | Not possible | **Permit-based self-decrypt of own ballot** |
| Trust model | Trust the threshold committee | **Trust the math (FHE)** |

---

## Challenges I ran into

**The COOP/COEP + MetaMask fight.** CoFHE SDK needs SharedArrayBuffer for WASM workers, which requires Cross-Origin headers. But `require-corp` breaks MetaMask's iframe injection. Ended up using `credentialless` instead, which works but means the SDK falls back to single-threaded mode. It's slower (~9 seconds to encrypt) but it actually works.

**CoFHE SDK is pre-1.0 and it shows.** The `WagmiAdapter` function signature changed between patch versions. `walletClient.getAddresses()` stopped working in some configurations. Built a fallback chain: try WagmiAdapter → catch → try direct connect → catch → retry without workers. It's ugly but reliable.

**Gas scales linearly with options.** Each `vote()` call runs a loop: for every option, it does `FHE.eq` + `FHE.select` + `FHE.add`. A 2-option proposal costs ~1.2M gas. 5 options costs ~2.8M. 10 options pushes toward 5M. There's no way around it — the contract has to touch every encrypted tally.

**Debugging encrypted state is pain.** When `FHE.add` silently does nothing because you forgot `FHE.allowThis`, there's no error. The tally just stays at zero. You can't `console.log` an `euint32`. You find out 20 minutes later when reveal shows all zeros. Had to develop a mental model of "what does the contract think it's holding" without ever being able to check.

**Permit system quirks.** CoFHE requires an active EIP-712 permit before `decryptForView` works. If you call decrypt without first calling `getOrCreateSelfPermit`, you get a cryptic "Active permit not found" error. Not documented anywhere — had to read the SDK source to figure it out.

**ShadowSpace ACL for incrementProposalCount.** In Wave 1, any address could call `incrementProposalCount` on ShadowSpace. Wave 2 fixes this with `setShadowVoteContract()` — only the registered ShadowVote contract address can call it. Required a constructor + `owner` pattern and a migration to the upgraded contract.

---

## Technologies I used

| Layer | Technology | Why we picked it |
|-------|-----------|------------------|
| FHE Engine | **Fhenix CoFHE** coprocessor | Runs FHE operations on top of standard EVM — no separate chain needed |
| FHE SDK | **@cofhe/sdk 0.4.0** | Browser-side encryption, ZK proofs, EIP-712 permits |
| FHE Contracts | **@fhenixprotocol/cofhe-contracts 0.1.0** | Solidity types: `euint32`, `ebool`, `InEuint32` |
| Smart Contracts | **Solidity 0.8.25** (EVM Cancun) | Latest compiler with transient storage support |
| Frontend | **React 19** + TypeScript + **Vite 6** | Fast dev, native ESM, HMR |
| Styling | **Tailwind CSS 4** + **Motion 12** | Utility-first CSS, scroll animations, stagger effects |
| Wallet | **wagmi 3** + **viem 2** | Type-safe contract reads/writes, MetaMask integration |
| State | **Zustand 5** | UI-only state (no data persistence — all data from chain) |
| Build | **Hardhat** + @cofhe/hardhat-plugin | Compile, deploy, test FHE contracts |
| Hosting | **Vercel** | COOP/COEP headers for WASM, SPA routing |
| Network | **Ethereum Sepolia** (11155111) | Testnet with Fhenix CoFHE coprocessor active |

---

## How we built it

### Phase 1 — The voting contract

Started with the core question: how do you count votes without knowing what they are?

The answer is a loop. For each option in a proposal, keep an encrypted counter initialized to `FHE.asEuint32(0)`. When someone votes, their choice arrives as an encrypted `euint32` from the browser. The contract checks every option: `FHE.eq(vote, optionIndex)`. If it matches, `FHE.select` returns an encrypted 1, otherwise encrypted 0. Then `FHE.add` adds that to the tally.

The contract runs this for every option on every vote. It never knows which option matched — it just updates all the tallies homomorphically.

```solidity
for (uint8 i = 0; i < proposal.optionCount; i++) {
    ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
    euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
    tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
    FHE.allowThis(tallies[_proposalId][i]);
}
```

### Phase 2 — Reveal mechanism

After the deadline, anyone can call `revealResults`. It checks that the deadline passed and quorum was met, then calls `FHE.allowPublic` on each tally handle. This tells the CoFHE coprocessor "this encrypted value can now be decrypted by anyone."

On the frontend, `decryptForView` with an EIP-712 permit reads the actual numbers. We show animated bar charts with a winner badge.

### Phase 3 — Verify My Vote

This was the feature that made the privacy story complete. During `vote()`, the contract stores the voter's encrypted ballot: `userEncryptedVotes[id][msg.sender] = option`. Then it calls `FHE.allowSender(...)` — which permits only the original voter to decrypt it.

In the UI, there's a "Verify My Vote" button that calls `getMyVote()` → `decryptForView` with your permit → shows you "You voted: Option 2". Nobody else can see this. It's the FHE version of "I voted" sticker, except it's cryptographically verifiable.

### Phase 4 — Advanced FHE operations

Added three more FHE operations for on-chain analytics without revealing raw data:

- `FHE.gte(totalVotes, quorum)` — checks if quorum is met entirely on encrypted values, returns `ebool`. Nobody sees the actual vote count until reveal.
- `FHE.max(tallies[0], tallies[1])` — finds the winning option without revealing any tally. Returns an encrypted handle to the largest value.
- `FHE.sub(tallies[0], tallies[1])` — computes the encrypted margin of victory. Only meaningful after reveal, but computed on ciphertext.

### Phase 5 — DAO Spaces

Built ShadowSpace.sol as a second contract — on-chain DAO registry. 8 crypto-specific categories (DeFi, NFT, Infrastructure, Gaming, Social, Privacy, L2/Scaling, DAO Tooling). Create a Space, add members, set default quorum. Wave 2 upgraded the contract with `leaveSpace`, `archiveSpace`, `setShadowVoteContract` ACL, fixed `removeMember` to clean up the memberLists array, and added the `SpaceArchived` event.

### Phase 6 — Frontend

14 pages, all reading from chain through wagmi's `readContract`. No backend, no database, no localStorage for any governance data.

The CoFHE SDK integration lives in `useCofhe.ts` — handles initialization with fallback (WagmiAdapter → direct connect → retry without workers). `useVote.ts` does the encryption: `Encryptable.uint32(optionIndex)` → `encryptInputs` → `{ctHash, securityZone, utype, signature}` tuple → `writeContract`. `useReveal.ts` handles permit creation + batch decryption of all option tallies.

Wave 2 added: FHE step visualizer with FheBadge labels during the voting flow, confetti animation on vote success, personal stats widgets in the Dashboard (My Votes Cast, My Spaces count), My Spaces sidebar widget, Spaces tab in main nav, My Spaces / Explore sub-tabs in the Spaces page, Leave Space + Archive Space buttons in SpaceDetail, CategoryEmoji component for Space icons, and MobileTabBar expanded to 5 tabs.

---

## What requires Fhenix FHE (won't work without it)

| Feature | FHE Operations | Why FHE is needed |
|---------|---------------|-------------------|
| Casting a vote | `asEuint32`, `eq`, `select`, `add`, `allowThis`, `allowSender` | Ballot must be encrypted before on-chain submission. Contract tallies without seeing values. |
| Revealing results | `allowPublic` | Tallies stay encrypted until explicitly unlocked after deadline. |
| Verifying own vote | `allowSender` + permit-based `decryptForView` | Only the voter can decrypt their own ballot. |
| Quorum check | `gte`, `add` | Check if enough votes cast without revealing the count. |
| Winner detection | `max` | Find the leading option without revealing any tally. |
| Vote differential | `sub` | Compute margin of victory on ciphertext. |

### What works without FHE

- Creating proposals (title and options are public metadata)
- Reading proposal metadata (deadline, quorum, voter count)
- Checking `hasUserVoted` (public boolean — proves participation, not choice)
- DAO Space creation, joining, leaving, archiving, member management

---

## FHE operations deep dive

ShadowDAO uses **10 distinct FHE operations** across 2 contracts and 4 frontend hooks:

### Smart contract operations

```solidity
// 1. Create encrypted zero counters for each option
euint32 zero = FHE.asEuint32(0);

// 2. Grant contract permission to operate on its own encrypted data
FHE.allowThis(zero);

// 3. Convert browser-encrypted input into on-chain FHE type
euint32 option = FHE.asEuint32(_encryptedOption);

// 4. Encrypted equality — does this vote match option i?
ebool isMatch = FHE.eq(option, FHE.asEuint32(i));

// 5. Encrypted conditional — if match: 1, else: 0
euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));

// 6. Encrypted addition — add to tally without knowing the value
tallies[id][i] = FHE.add(tallies[id][i], increment);

// 7. Grant voter permission to decrypt their own ballot only
FHE.allowSender(userEncryptedVotes[id][msg.sender]);

// 8. After deadline: make aggregate tallies publicly decryptable
FHE.allowPublic(tallies[id][i]);

// 9. Encrypted comparison — is total votes >= quorum threshold?
ebool quorumMet = FHE.gte(totalEncrypted, quorumEncrypted);

// 10. Encrypted max — which option leads, without revealing counts?
euint32 leader = FHE.max(tallies[id][0], tallies[id][1]);

// 11. Encrypted subtraction — margin of victory on ciphertext
euint32 margin = FHE.sub(tallies[id][0], tallies[id][1]);
```

### Frontend SDK operations

```typescript
// useCofhe.ts — initialize FHE engine
const client = createCofheClient({ useWorkers: false });
const adapter = await WagmiAdapter(walletClient, publicClient);
await client.connect(adapter);

// useVote.ts — encrypt ballot in browser with ZK proof
const encrypted = await client
  .encryptInputs([Encryptable.uint32(BigInt(optionIndex))])
  .execute();
// Result: { ctHash, securityZone, utype, signature }

// useReveal.ts — decrypt revealed tallies with permit
const permit = await client.permits.getOrCreateSelfPermit();
const result = await client
  .decryptForView(ctHash, FheTypes.Uint32)
  .withPermit()
  .execute();
// result.decryptedValue = 42 (actual vote count)

// useVerifyVote.ts — voter privately checks own ballot
const myVoteHash = await readContract({ functionName: 'getMyVote', args: [proposalId] });
const myVote = await client
  .decryptForView(myVoteHash, FheTypes.Uint32)
  .withPermit()
  .execute();
// "You voted: Option 2" — visible only to you
```

---

## What we learned

FHE makes truly private voting possible on-chain in a way that threshold encryption fundamentally can't. With threshold, you're trusting a committee to not collude. With FHE, there's no committee — the math itself prevents disclosure.

But it's not free. Gas costs scale with the number of FHE operations, and each option in a vote adds 3 operations. For real-world DAOs with many proposals and options, this needs optimization — batch processing, off-chain FHE where it makes sense, or waiting for gas costs to drop.

The CoFHE SDK is powerful but clearly early-stage. Documentation is thin, error messages are cryptic, and behavior changes between minor versions. We spent probably 30% of development time on SDK debugging and workarounds.

Debugging encrypted state is a completely different discipline. You can't print values. You can't inspect storage. You write the logic, deploy, test end-to-end, and find out if it works 20 minutes later when you try to decrypt the result. It forces you to think very carefully before you write.

The permit system is also something we didn't anticipate. Every `decryptForView` needs an active EIP-712 permit for the current chain + account. If you forget `getOrCreateSelfPermit()` before decryption, you get a silent failure. Learned that the hard way.

---

## User experience

**1. Connect** — MetaMask on Sepolia. Wrong network detection with auto-switch prompt.

**2. Dashboard** — Active proposals loaded from chain via `getProposalCount()` + `getProposal(i)` loop. Live notification bell with VoteCast/ProposalCreated/ResultsRevealed events from `getLogs`. Personal stats: My Votes Cast, My Spaces count. My Spaces sidebar widget shows your DAOs at a glance.

**3. Create** — 4-step wizard. Step 1: title + description. Step 2: add options (with templates — "Yes/No", "Approve/Reject/Abstain"). Step 3: pick duration (presets: 10 min to 30 days, or custom date picker) + set quorum. Step 4: review + deploy. After MetaMask confirms, we parse the `ProposalCreated` event for the proposalId and generate a shareable voting link.

**4. Vote** — Select option → "Encrypt & Submit" → FHE step visualizer shows each operation in sequence with FheBadge labels (asEuint32 → eq → select → add → allowSender). Progress: Initializing FHE engine → Encrypting ballot (~9 sec) → Submitting to Sepolia → Waiting for block confirmation. On success, confetti animation fires. The encrypted tuple `{ctHash, securityZone, utype, signature}` is what goes on-chain — the option index is never transmitted in plaintext.

**5. Verify** — After voting, "Verify My Vote (FHE Decrypt)" button appears. Signs EIP-712 permit → calls `getMyVote()` → decrypts with `decryptForView` → shows "You voted: Option 1". Only visible to the voter.

**6. Wait** — Live countdown timer (HH:MM:SS). No intermediate tallies. No indication of which way the vote is going. This is the point — nobody can game the timing.

**7. Reveal** — After deadline + quorum, anyone clicks "Reveal Results" → `revealResults()` calls `FHE.allowPublic` on each tally → frontend decrypts with permit → animated bar charts with winner badge and "Verified on Sepolia" footer.

**8. Spaces** — Spaces tab in nav (desktop + mobile). My Spaces tab shows DAOs you belong to. Explore tab shows all public Spaces. Inside SpaceDetail: Leave Space button for members, Archive Space button for the creator. Category icons via CategoryEmoji component.

**All data from blockchain. No backend, no database, no localStorage for governance data.**

---

## Roadmap

### ✅ Wave 1 — Core FHE Voting
First working implementation: create proposal → encrypt vote in browser → cast on-chain → reveal aggregate results. `ShadowVote.sol` deployed with 10 FHE operations. `ShadowSpace.sol` deployed as DAO registry. Full voting UI with wallet connect, proposal lifecycle, and "Verify My Vote" via `FHE.allowSender`.

### ✅ Wave 2 — Spaces + Lifecycle + UI Polish

**The core upgrade: Spaces become fully functional DAOs, not just metadata records.**

**ShadowSpace.sol redeployed** (`0x2B2A4370c5f26cB109D04047e018E65ddf413c88`) with:
- `leaveSpace()` — members can exit; creator is blocked and must archive instead
- `archiveSpace()` — soft-delete by creator, sets `active = false` on-chain
- `removeMember()` fix — now cleans the `memberLists[]` array via swap-and-pop, not just the mapping
- ACL fix — `incrementProposalCount` restricted to ShadowVote contract via `setShadowVoteContract()` + `onlyOwner`

**Frontend:**
- Spaces page — Explore / My Spaces tabs, category filter with emoji pills, search, animated filter panel
- SpaceDetail — join/leave/archive with confirmation modal, member list with remove (creator only), Etherscan links
- Dashboard — real on-chain stats pulled in parallel: proposals created, votes cast, spaces joined
- ProposalDetail — FHE step visualizer with `FheBadge` labels (`FHE.asEuint32`, `FHE.eq + FHE.select + FHE.add`, `FHE.allowSender`)
- Confetti on vote success (48 particles, pure `motion/react`)
- `CategoryEmoji` component — 8 category icons
- Mobile bottom nav expanded to 5 tabs with labels and blur backdrop

### 🔜 Wave 3 — Treasury + Weighted Voting
`ShadowTreasury.sol`: encrypted balance (`euint64`), deposit/withdraw with `FHE.gte` solvency check, allocations linked to passed proposals. `ShadowVoteV2.sol`: weighted voting via `FHE.mul(vote, votingPower)`. FHE Operation Visualizer — animated diagram of encryption steps. Settings page with dark mode toggle.

### 📋 Wave 4 — Delegation + Analytics
`ShadowDelegate.sol`: delegate/undelegate voting power, vote-as-delegate, top-5 leaderboard. On-chain discussion threads via IPFS hash. Analytics dashboard — participation rate, quorum donut, voter heatmap. Full activity feed from contract event logs.

### 🚀 Wave 5 — SDK + Gasless + Mainnet-ready
`shadowdao-sdk` npm package with `ShadowVoteClient` + `ShadowSpaceClient`. EIP-712 meta-transactions for gasless voting. Multi-chain selector. PWA with offline fallback. Lighthouse ≥ 90. `TEMPLATE.md` — adapt to any contract in 30 minutes.

---

## What's next for ShadowDAO

- **Wave 3: Treasury + weighted voting** — `ShadowTreasury.sol` with `euint64` encrypted balance, `FHE.gte` solvency checks, and `FHE.mul`-based weighted ballots
- **Encrypted delegation** — delegate your vote to another address using `FHE.allow(delegate)`, where the delegate casts your encrypted ballot without seeing it
- **Quadratic voting** — sqrt-weighted ballots that resist plutocracy
- **Mainnet** — when CoFHE launches on mainnet, ShadowDAO goes with it

---

## Deployed Contracts

| Contract | Address | FHE Operations |
|----------|---------|----------------|
| ShadowVote.sol | [`0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5`](https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5) | asEuint32, eq, select, add, gte, max, sub, allowThis, allowPublic, allowSender |
| ShadowSpace.sol (Wave 2 upgrade) | [`0x2B2A4370c5f26cB109D04047e018E65ddf413c88`](https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88) | — (DAO registry, no FHE) |

Ethereum Sepolia · Chain ID 11155111 · Solidity 0.8.25 · EVM Cancun

### ShadowVote.sol — all functions

| Function | FHE | What it does |
|----------|-----|-------------|
| `createProposal(title, optionCount, deadline, quorum)` | `asEuint32`, `allowThis` | Creates proposal with encrypted zero counters per option |
| `vote(proposalId, encryptedOption)` | `asEuint32`, `eq`, `select`, `add`, `allowSender` | Tallies encrypted vote without seeing it |
| `revealResults(proposalId)` | `allowPublic` | Unlocks aggregate tallies for public decryption |
| `getMyVote(proposalId)` | Permit-gated | Returns voter's own encrypted ballot handle |
| `checkQuorumEncrypted(proposalId)` | `gte`, `add`, `asEuint32` | Encrypted quorum check without revealing count |
| `getEncryptedMaxTally(proposalId)` | `max` | Finds leading option on ciphertext |
| `getEncryptedDifferential(proposalId, a, b)` | `sub` | Encrypted margin between two options |
| `cancelProposal(proposalId)` | — | Creator cancels before any votes cast |
| `extendDeadline(proposalId, newDeadline)` | — | Creator extends voting period (forward only) |
| `getProposal`, `getProposalCount`, `hasUserVoted`, `getUserProposals`, `getUserVotes`, `getEncryptedTally` | — | Read-only views |

### ShadowSpace.sol — all functions

| Function | What it does |
|----------|-------------|
| `constructor(owner)` | Deploys contract with designated owner |
| `createSpace(name, description, category, isPublic, defaultQuorum, initialMembers)` | Deploy on-chain DAO with metadata |
| `joinSpace(spaceId)` | Join public Space |
| `leaveSpace(spaceId)` | Member voluntarily leaves a Space; cleans up memberLists array |
| `archiveSpace(spaceId)` | Creator archives a Space; emits `SpaceArchived`; prevents new joins |
| `addMember(spaceId, member)` / `removeMember(spaceId, member)` | Creator manages membership; `removeMember` cleans up memberLists array |
| `setShadowVoteContract(addr)` | Owner sets the only address allowed to call `incrementProposalCount` (ACL fix) |
| `updateSpace(spaceId, name, description)` | Creator edits Space info |
| `getSpace`, `getSpaceCount`, `isMember`, `getMembers`, `getUserSpaceIds` | Read-only views |

---

## Run locally

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
npm run dev
```

Node.js 18+, MetaMask on Sepolia with test ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia)).

### Run contract tests

```bash
# Set up .env with PRIVATE_KEY and PRIVATE_KEY_2
npm run test:live
```

Tests cover: proposal creation, voting, reveal, cancel, extend deadline, quorum checks, double-vote prevention, Space creation/join/leave/archive/update, and cross-account authorization.

---

## License

MIT
