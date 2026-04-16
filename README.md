<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="ShadowDAO Logo" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center">
  Private on-chain DAO governance powered by Fhenix FHE
</p>

<p align="center">
  <a href="https://shadowdao.vercel.app">Live Demo</a> · <a href="https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86">ShadowVote on Etherscan</a> · <a href="https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88">ShadowSpace on Etherscan</a> · <a href="https://cofhe-docs.fhenix.zone">Fhenix Docs</a>
</p>

---

## What it does

Ever voted in a DAO and felt like you were being watched? That's because you were. Every Snapshot vote, every Governor ballot — it's all public. Everyone sees what you picked.

ShadowDAO fixes that. You vote, your ballot gets FHE-encrypted right in the browser before it even hits the chain. The smart contract counts votes *on the ciphertext* — it literally adds numbers it can't read. When the deadline passes and quorum is met, anyone can trigger the reveal. But here's the thing: only the totals get decrypted. Your individual vote stays encrypted forever.

The flow is simple: pick an option → CoFHE SDK encrypts it as `euint32` → ZK proof gets generated → the encrypted tuple goes on-chain → the contract runs `FHE.eq` + `FHE.select` + `FHE.add` for each option to tally without seeing anything → after the deadline, `FHE.allowPublic` makes the aggregate readable.

And if you're paranoid (fair), there's a "Verify My Vote" button. It uses `FHE.allowSender` so only *you* can decrypt *your own* ballot. Nobody else.

**Wave 2 is live:** Space-gated voting (proposals linked to Spaces, only members can vote), cross-contract ACL wiring between ShadowVote + ShadowSpace, encrypted quorum checks, differential tally, Space lifecycle (leave/archive), 5-step proposal creation with Space selector. **13 FHE operations** across 2 contracts.

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

ShadowDAO uses **13 distinct FHE operations** across 2 contracts and 4 frontend hooks:

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

**Smart contracts (2 deployed on Sepolia):**
- [x] `ShadowVote.sol` — full encrypted vote lifecycle: create → cast → tally → reveal
- [x] `ShadowSpace.sol` — on-chain DAO registry: create spaces, manage members, 8 categories

**FHE operations (10):** `asEuint32`, `eq`, `select`, `add`, `gte`, `max`, `sub`, `allowThis`, `allowPublic`, `allowSender`

**App:** wallet connect, create proposal, cast FHE-encrypted vote, reveal aggregate results, "Verify My Vote" via `FHE.allowSender` + EIP-712 permit, cancel + extend deadline (admin), proposal list with live status

---

### ✅ Wave 2 Updates

**ShadowVote redeployed:** `0x625b9b6cBd467E69b4981457e7235EBd2874EF86` (Ethereum Sepolia)

#### Space-Gated Voting

The biggest governance addition this wave. Proposals can be linked to a Space — if `spaceGated = true`, only Space members pass the on-chain gate in `vote()`.

- Cross-contract call: `IShadowSpace(shadowSpaceContract).isSpaceMember(spaceId, msg.sender)` — non-members revert, no silent fail
- `createProposal()` takes 2 new params: `_spaceId` + `_spaceGated`. Contract stores both in the Proposal struct and calls `incrementProposalCount()` on ShadowSpace
- `getProposalsBySpace(spaceId)` — returns all proposal IDs linked to a Space via `spaceProposals[]` mapping
- Bidirectional wiring: `setShadowSpaceContract()` on ShadowVote + `setShadowVoteContract()` on ShadowSpace. Script: `scripts/wire.ts`

#### Encrypted On-Chain Analytics

Three new FHE read functions — query encrypted tallies without revealing raw data.

- `checkQuorumEncrypted(proposalId)` — `FHE.gte(totalVotes, quorum)` → `ebool`. Checks if quorum met entirely on ciphertext, no vote count leaked
- `getEncryptedMaxTally(proposalId)` — `FHE.max(tallies[0], tallies[1])` → finds leading option without revealing any tally
- `getEncryptedDifferential(proposalId, optionA, optionB)` — `FHE.sub(tallies[A], tallies[B])` → encrypted margin of victory

#### Spaces Lifecycle

- `leaveSpace()` — member exits voluntarily; creator is blocked (`require(msg.sender != creator)`) and must archive instead
- `archiveSpace()` — soft-delete: `active = false`, emits `SpaceArchived`. Irreversible on-chain
- `removeMember()` fix — Wave 1 only cleared `isMember` mapping but left ghost addresses in `memberLists[]`. Now uses swap-and-pop cleanup so `getMembers()` is accurate
- `setShadowVoteContract(address)` + ACL — `incrementProposalCount` gated: `require(msg.sender == shadowVoteContract)`. Wave 1 had no gate

#### Frontend

- **5-step proposal creation** — new Step 2: Space selector. Pick "Global" or a Space you belong to. Space quorum auto-fills from `defaultQuorum`
- **Space badge on proposals** — lock icon + category emoji + Space name on every gated proposal card. Dropdown filter by Space
- **Membership gate UI** — ProposalDetail shows green banner if you're a member, red "Join the Space to vote" if not. Vote button disabled
- **Live Space proposals** — SpaceDetail fetches actual proposals via `getProposalsBySpace()` with status badges, vote counts, countdown
- FHE step visualizer, confetti on vote, dashboard stats, My Spaces tabs, leave/archive buttons — all shipped
- New page: `/app/spaces/:id` with live proposal list

---

### 🔜 Wave 3 Plan

**Encrypted Treasury** — `ShadowTreasury.sol`, new contract. DAO balance stored as `euint64` — invisible on Etherscan, only owner decrypts via permit.

- `deposit()` → `FHE.add(encryptedBalance, amount)` — balance grows on ciphertext, Etherscan shows zero-value internal tx
- `withdraw(InEuint64 amount)` → `FHE.gte(balance, amount)` solvency gate before `FHE.sub`. Contract pays zero if insolvent, no revert leaking state
- `proposeAllocation(proposalId, InEuint64 amount)` — links a budget line to a ShadowVote proposal. Amount encrypted, nobody sees how much is at stake
- `executeAllocation(proposalId)` — releases ETH only if `proposal.revealed == true && votesFor >= quorum`. Treasury + governance in one flow
- Invariant enforced: `sum(allocations) <= encryptedBalance` — verified with `FHE.gte` before every allocation

**Weighted Voting** — `ShadowVoteV2.sol` upgrade. Vote power is per-address, encrypted.

- `setVotingPower(voter, InEuint32 power)` — Space admin sets encrypted weight. Nobody sees who has how much power
- Tally: `FHE.add(tally[option], FHE.mul(encryptedVote, encryptedPower))` — weight applied on ciphertext, even the contract doesn't know individual power
- `getEncryptedVotingPower(address)` → self-decrypt via `FHE.allowSender`. Only you see your own weight
- "Weighted" badge on proposal cards in the UI — users know power differs but not by how much

**Proposal Description on IPFS** — `bytes32 descriptionHash` stored on-chain per proposal. Markdown body pinned to Pinata/IPFS, rendered in ProposalDetail.

**Settings page** — dark/light theme toggle (CSS variables), notification preferences, default quorum per user

**+3 FHE ops:** `FHE.mul` (weighted tally), `FHE.sub` (treasury withdraw), `FHE.gte` (solvency) → **16 total**

---

### 📋 Wave 4 Plan

**Encrypted Delegation** — `ShadowDelegate.sol`, new contract. Delegate your vote to another address without revealing your power.

- `delegate(address to)` — transfers `euint32 votingPower` to delegate via `FHE.add(delegatePower, myPower)`. Original zeroed with `FHE.select(true, zero, myPower)`
- `undelegate()` — reclaims power. Delegate's accumulated power reduced via `FHE.sub`
- `voteAsDelegate(proposalId, encryptedVote)` — delegate casts with combined power. Tally: `FHE.add(tally, FHE.mul(vote, delegatedPower))`
- `getTopDelegates(limit)` — leaderboard sorted by `FHE.max` comparisons. Only rank visible, not amounts
- `getDelegatedPower(address)` — self-decrypt via `FHE.allowSender`. Only you see how much was delegated to you
- Double-delegation blocked: `require(delegatedTo[msg.sender] == address(0))` — no chaining

**On-Chain Discussion** — lightweight comment layer per proposal.

- `postComment(proposalId, bytes32 ipfsHash)` — stores IPFS pointer on-chain, emits `CommentPosted(proposalId, author, ipfsHash)`
- Frontend renders Markdown from IPFS. Timestamps from block numbers. Author address shown with ENS fallback
- `getCommentCount(proposalId)` / `getComment(proposalId, index)` — paginated reads

**Analytics Dashboard** — full governance analytics from on-chain data.

- Participation rate chart — `VoteCast` events over time, line chart via recharts
- Quorum success rate — donut: proposals that hit quorum vs didn't
- Proposals by category — bar chart grouped by Space category
- Voter activity heatmap — calendar grid colored by vote frequency per day
- All data from `getLogs` — no backend, no indexer

**Activity Feed** — real-time event stream on Dashboard.

- `ProposalCreated`, `VoteCast`, `ResultsRevealed`, `SpaceCreated`, `MemberJoined` — parsed from `getLogs` with block timestamps
- Filterable by event type. Auto-refreshes every 30 seconds

**Proposal Templates Library** — reusable templates beyond Yes/No.

- Budget allocation (Option A: 100K / Option B: 50K / Option C: reject)
- Election (candidate list, single winner)
- Parameter change (specific value options)
- Saved per-Space, creator picks from library in Step 2

**+2 FHE ops:** `FHE.select` (delegation zero-out), `FHE.max` (leaderboard sort) → **18 total**

---

### 🚀 Wave 5 — SDK + Gasless + Mainnet-ready

**`@shadowdao/sdk`** — npm package with `ShadowVoteClient`, `ShadowSpaceClient`, generic `useShadowVote(address, abi)` React hook

**Gasless voting** — EIP-712 meta-tx: user signs `VotePermit{proposalId, encryptedOption, nonce}`, relayer submits, zero gas for voter

**Frontend:** multi-chain selector, PWA + service worker, lazy routes, animated 404, OG meta tags, Lighthouse ≥ 90, `TEMPLATE.md`

> **FHE ops by wave:** Wave 1: 10 · **Wave 2: 13** · Wave 3: 16 · Wave 4: 18 · Wave 5: SDK wrappers, no new ops

---

## What's next for ShadowDAO

- **Wave 3: Encrypted treasury** — `ShadowTreasury.sol` with `euint64` hidden balance, `FHE.gte` solvency gates, weighted voting via `FHE.mul`
- **Wave 4: Delegation** — encrypted vote delegation via `ShadowDelegate.sol`, on-chain discussion, analytics dashboard
- **Wave 5: SDK + gasless** — `@shadowdao/sdk` npm package, EIP-712 meta-tx relay, multi-chain, PWA
- **Mainnet** — when CoFHE launches on mainnet, ShadowDAO goes with it

---

## Deployed Contracts

| Contract | Address | FHE Operations |
|----------|---------|----------------|
| ShadowVote.sol (Wave 2) | [`0x625b9b6cBd467E69b4981457e7235EBd2874EF86`](https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86) | asEuint32, eq, select, add, gte, max, sub, allowThis, allowPublic, allowSender + space-gated voting |
| ShadowSpace.sol (Wave 2) | [`0x2B2A4370c5f26cB109D04047e018E65ddf413c88`](https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88) | — (DAO registry, cross-contract ACL) |

Ethereum Sepolia · Chain ID 11155111 · Solidity 0.8.25 · EVM Cancun

### ShadowVote.sol — all functions

| Function | FHE | What it does |
|----------|-----|-------------|
| `createProposal(title, optionCount, deadline, quorum, spaceId, spaceGated)` | `asEuint32`, `allowThis` | Creates proposal; if space-gated, calls `IShadowSpace.incrementProposalCount` |
| `vote(proposalId, encryptedOption)` | `asEuint32`, `eq`, `select`, `add`, `allowSender` | Tallies encrypted vote; if space-gated, checks `IShadowSpace.isSpaceMember` |
| `revealResults(proposalId)` | `allowPublic` | Unlocks aggregate tallies for public decryption |
| `getMyVote(proposalId)` | Permit-gated | Returns voter's own encrypted ballot handle |
| `checkQuorumEncrypted(proposalId)` | `gte`, `add`, `asEuint32` | Encrypted quorum check without revealing count |
| `getEncryptedMaxTally(proposalId)` | `max` | Finds leading option on ciphertext |
| `getEncryptedDifferential(proposalId, a, b)` | `sub` | Encrypted margin between two options |
| `cancelProposal(proposalId)` | — | Creator cancels before any votes cast |
| `extendDeadline(proposalId, newDeadline)` | — | Creator extends voting period (forward only) |
| `getProposalsBySpace(spaceId)` | — | Returns proposal IDs linked to a Space |
| `setShadowSpaceContract(address)` | — | Owner sets registered ShadowSpace for ACL |
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
