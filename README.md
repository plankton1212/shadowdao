<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="ShadowDAO Logo" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center">
  Private on-chain DAO governance powered by Fhenix CoFHE
</p>

<p align="center">
  <a href="https://shadowdao.vercel.app">Live Demo</a> ·
  <a href="https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86">ShadowVote</a> ·
  <a href="https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88">ShadowSpace</a> ·
  <a href="https://sepolia.etherscan.io/address/0xD8037F77d1D5764f3639A6216a580Cd608fB7fAA">ShadowVoteV2</a> ·
  <a href="https://sepolia.etherscan.io/address/0xc7E024c8259b4c0c9Cd3F5A7987E7E79ACf8b0db">ShadowTreasury</a> ·
  <a href="https://sepolia.etherscan.io/address/0x2a896334a0B1263f397A45844a307D4cF90cb5f1">ShadowDelegate</a> ·
  <a href="https://cofhe-docs.fhenix.zone">Fhenix Docs</a>
</p>

---

## What it does

Ever voted in a DAO and felt like you were being watched? That's because you were. Every Snapshot vote, every Governor ballot — it's all public. Everyone sees what you picked.

ShadowDAO fixes that. You vote, your ballot gets FHE-encrypted right in the browser before it even hits the chain. The smart contract counts votes *on the ciphertext* — it literally adds numbers it can't read. When the deadline passes and quorum is met, anyone can trigger the reveal. But here's the thing: only the totals get decrypted. Your individual vote stays encrypted forever.

The flow is: pick an option → CoFHE SDK encrypts it as `euint32` + generates ZK proof → the encrypted tuple goes on-chain → the contract runs `FHE.eq` + `FHE.select` + `FHE.add` for each option to tally without seeing anything → after the deadline, `FHE.allowPublic` makes the aggregate readable.

And if you're paranoid (fair), there's a "Verify My Vote" button. It uses `FHE.allowSender` so only *you* can decrypt *your own* ballot. Nobody else.

**All 5 waves are complete.** 4 contracts deployed on Sepolia. **16 FHE operations** across the full stack.

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
│                                  FHE.mul(inc, power)── compute ──│  ← V2 weighted
│                                  FHE.add(tally, inc)── compute ──│
│                                                                  │
│                               5. FHE.allowSender(vote)           │
│                                  voter can self-verify           │
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

These aren't edge cases. They happen every day across DeFi. The root cause is always the same: **transparent voting forces participants to optimize for consequences rather than honest preference.**

Snapshot added "shielded voting" recently, but it uses threshold encryption — after the vote ends, all individual votes get decrypted and become public. That's not privacy. That's delayed transparency.

ShadowDAO is different because individual votes are never decrypted. The contract performs arithmetic on encrypted data through Fhenix's CoFHE coprocessor. It knows the totals because it computed them homomorphically. But it never knew any individual ballot.

### ShadowDAO vs Snapshot

|  | Snapshot | ShadowDAO |
|--|---------|-----------|
| Privacy | Optional add-on ("Shielded") | **Mandatory, default** |
| Encryption | Threshold — reveals all votes after deadline | **FHE — individual votes never revealed** |
| Where votes live | Off-chain (IPFS) | **On-chain (Ethereum + CoFHE)** |
| Tallying | Decrypt everything, count in cleartext | **Count on ciphertext, reveal only totals** |
| After reveal | Every single vote becomes public | **Only aggregates public** |
| Voter verification | Not possible | **Permit-based self-decrypt of own ballot** |
| Treasury | Fully visible on Etherscan | **euint32 encrypted balance** |
| Weighted voting | Off-chain | **FHE.mul on encrypted weights** |
| Delegation | Public amounts | **Encrypted power pool (FHE.add)** |
| Gas for voting | Required | **Optional (EIP-712 gasless meta-tx)** |
| FHE operations | 0 | **16 distinct operations** |

---

## Challenges I ran into

**The COOP/COEP + MetaMask fight.** CoFHE SDK needs SharedArrayBuffer for WASM workers, which requires Cross-Origin headers. But `require-corp` breaks MetaMask's iframe injection. Ended up using `credentialless` instead, which works but means the SDK falls back to single-threaded mode. It's slower but actually works.

**CoFHE SDK is pre-1.0 and it shows.** The `WagmiAdapter` function signature changed between patch versions. `walletClient.getAddresses()` stopped working in some configurations. Built a fallback chain: try WagmiAdapter → catch → try direct connect → catch → retry without workers. Also built a module-level singleton so only one CoFHE client ever exists per browser session, with wallet-address and chain-ID tracking to reset it when the account switches.

**Gas scales linearly with options.** Each `vote()` call runs a loop: for every option, it does `FHE.eq` + `FHE.select` + `FHE.add`. A 2-option proposal costs ~1.2M gas. 5 options costs ~2.8M. 10 options pushes toward 5M. There's no way around it — the contract has to touch every encrypted tally.

**Debugging encrypted state is pain.** When `FHE.add` silently does nothing because you forgot `FHE.allowThis`, there's no error. The tally just stays at zero. You can't `console.log` an `euint32`. You find out 20 minutes later when reveal shows all zeros. Had to develop a mental model of "what does the contract think it's holding" without ever being able to check.

**Non-ASCII in Solidity.** Em dashes in comments broke the Solidity compiler with "Invalid character in string." Had to write a Node.js script to strip all non-ASCII from contracts before compilation.

**BigInt vs Number in TypeScript.** `SHADOWVOTEV2_ADDRESS as const` created a literal type — TypeScript refused comparisons like `addr !== ZERO_ADDRESS` ("types have no overlap"). Fixed by using `as \`0x${string}\`` instead of `as const` throughout.

**Permit system quirks.** CoFHE requires an active EIP-712 permit before `decryptForView` works. If you call decrypt without first calling `getOrCreateSelfPermit`, you get a cryptic "Active permit not found" error. Not documented anywhere — had to read the SDK source. Added a debounce guard so rapid clicks don't open multiple MetaMask signature dialogs.

---

## Technologies used

| Layer | Technology | Why |
|-------|-----------|-----|
| FHE Engine | **Fhenix CoFHE** coprocessor | Runs FHE operations on top of standard EVM — no separate chain needed |
| FHE SDK | **@cofhe/sdk 0.4.0** | Browser-side encryption, ZK proofs, EIP-712 permits |
| FHE Contracts | **@fhenixprotocol/cofhe-contracts 0.1.0** | Solidity types: `euint32`, `ebool`, `InEuint32` |
| Smart Contracts | **Solidity 0.8.25** (EVM Cancun) | 4 contracts deployed on Sepolia |
| Frontend | **React 19** + TypeScript + **Vite 6** | 14 lazy-loaded pages, code-split |
| Styling | **Tailwind CSS 4** + **Motion 12** | Utility-first CSS, scroll animations |
| Wallet | **wagmi 3** + **viem 2** | Type-safe contract reads/writes, MetaMask |
| Build | **Hardhat** + @cofhe/hardhat-plugin | Compile, deploy, test FHE contracts |
| IPFS | **Pinata** via Vercel serverless | Comments pinned server-side, JWT never in browser |
| Hosting | **Vercel** | COOP/COEP headers for WASM, serverless API routes |
| Network | **Ethereum Sepolia** (11155111) | Fhenix CoFHE coprocessor active |
| SDK | **shadowdao-sdk** | `ShadowVoteClient`, `ShadowSpaceClient`, `useShadowVote` hook |

---

## How we built it

### Phase 1 — The voting contract

Started with the core question: how do you count votes without knowing what they are?

The answer is a loop. For each option in a proposal, keep an encrypted counter initialized to `FHE.asEuint32(0)`. When someone votes, their choice arrives as an encrypted `euint32` from the browser. The contract checks every option: `FHE.eq(vote, optionIndex)`. If it matches, `FHE.select` returns an encrypted 1, otherwise encrypted 0. Then `FHE.add` adds that to the tally.

```solidity
for (uint8 i = 0; i < proposal.optionCount; i++) {
    ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
    euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
    tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
    FHE.allowThis(tallies[_proposalId][i]);
}
```

### Phase 2 — DAO Spaces + cross-contract ACL

Built ShadowSpace.sol as a second contract — on-chain DAO registry with 8 crypto-specific categories. Wave 2 upgraded with `leaveSpace`, `archiveSpace`, `setShadowVoteContract` ACL (fixes unbounded `incrementProposalCount`), and space-gated voting: `vote()` enforces membership via cross-contract call to `IShadowSpace.isSpaceMember()`. Added three FHE analytics functions: `FHE.gte` quorum check, `FHE.max` winner detection, `FHE.sub` vote differential.

### Phase 3 — Encrypted Treasury + Weighted Voting

`ShadowTreasury.sol`: DAO balance as `euint32` (milliETH units). `deposit()` via `FHE.add`. `withdraw()` with `FHE.gte` encrypted solvency check + `FHE.select` safe subtraction. Allocations linked to ShadowVote proposals — execute automatically after reveal + quorum.

`ShadowVoteV2.sol`: weighted voting via `FHE.mul(vote, power)`. Admin sets encrypted voting power per address. IPFS description hash stored as `bytes32` per proposal.

### Phase 4 — Delegation + Discussion + Analytics

`ShadowDelegate.sol`: `delegate(to, encryptedPower)` accumulates power into delegate's encrypted pool via `FHE.add`. `undelegate()` zeroes contribution with `FHE.select`. Leaderboard shows delegation counts (public) without revealing amounts.

On-chain discussion: `postComment(proposalId, bytes32)` stores IPFS CID hashes per proposal. Comment text served via Vercel serverless functions → Pinata gateway — Pinata JWT never touches the browser.

Analytics: participation line chart, quorum donut, category bars, voter heatmap, top voters — all computed from `getLogs`, no indexer, no backend.

### Phase 5 — SDK + Gasless + PWA

`voteWithSignature()` in ShadowVoteV2: EIP-712 signed meta-transaction, relayer pays gas, voter signs offline. Nonce per address prevents replay.

`shadowdao-sdk` npm package: `ShadowVoteClient`, `ShadowSpaceClient`, `useShadowVote` React hook, full TypeScript types. Any team can integrate FHE voting into their project.

PWA: `manifest.json` + service worker + offline fallback. All 14 routes lazy-loaded via `React.lazy` with `ErrorBoundary` production crash recovery.

---

## FHE operations — 16 across 4 contracts

| # | Operation | Where | What it does |
|---|-----------|-------|-------------|
| 1 | `FHE.asEuint32()` | Vote, V2 | Convert browser-encrypted input to on-chain FHE type |
| 2 | `FHE.eq()` | Vote, V2 | Encrypted equality: does this vote match option i? |
| 3 | `FHE.select()` | Vote, V2, Delegate | Encrypted if/else; safe zero-out on undelegate |
| 4 | `FHE.add()` | All 4 contracts | Homomorphic addition: tally, treasury balance, delegation pool |
| 5 | `FHE.allowThis()` | All 4 contracts | Contract retains access to ciphertext across transactions |
| 6 | `FHE.allowSender()` | Vote, V2, Treasury | Permit-gated: only msg.sender can decrypt |
| 7 | `FHE.allowPublic()` | Vote, V2 | Unlock aggregate tallies for public decryption after reveal |
| 8 | `FHE.gte()` | Vote, V2, Treasury | Encrypted ≥: quorum check + solvency gate on withdraw |
| 9 | `FHE.max()` | Vote, V2 | Find leading option without revealing any tally |
| 10 | `FHE.sub()` | Vote, V2, Treasury, Delegate | Subtraction: margin, balance decrement, power removal |
| 11 | `FHE.mul()` | ShadowVoteV2 | Weighted voting: multiply ballot by encrypted voting power |
| 12 | `FHE.add` (treasury deposit) | ShadowTreasury | `FHE.add(balance, units)` — balance grows on ciphertext |
| 13 | `FHE.gte` (solvency) | ShadowTreasury | `FHE.gte(balance, amount)` before any withdrawal |
| 14 | `FHE.sub` (balance) | ShadowTreasury | `FHE.sub(balance, units)` on withdraw and allocation execution |
| 15 | `FHE.add` (delegation) | ShadowDelegate | `FHE.add(pool, power)` accumulates delegated power |
| 16 | `FHE.select` (undelegate) | ShadowDelegate | `FHE.select(solvent, FHE.sub(pool, power), zero)` safe removal |

**Encrypted types:** `euint32` (tallies, balances, voting power), `ebool` (comparisons), `InEuint32` (browser inputs)

---

## What requires Fhenix FHE

| Feature | FHE Operations | Without FHE |
|---------|---------------|------------|
| Casting a vote | `asEuint32`, `eq`, `select`, `add`, `allowThis`, `allowSender` | Option visible on-chain |
| Weighted ballot | `mul(vote, power)` | Power amounts visible |
| Revealing results | `allowPublic` | Tallies exposed before deadline |
| Verifying own vote | `allowSender` + permit decrypt | Any observer could check |
| Quorum check | `gte(totalVotes, quorum)` | Vote count visible during voting |
| Winner detection | `max(tally[0], tally[1])` | Leading option visible mid-vote |
| Treasury balance | `add`, `gte`, `sub`, `allowSender` | Balance visible on Etherscan |
| Delegation pool | `add(pool, power)`, `select` zero-out | Power amounts visible |

### What works without FHE
Creating proposals, reading metadata (deadline, quorum, voter count), `hasUserVoted` boolean, Space creation/membership, comment authorship timestamps.

---

## User experience

**1. Connect** — MetaMask on Sepolia. Wrong network auto-detected with one-click switch.

**2. Dashboard** — Active proposals, live notification bell (VoteCast / ProposalCreated / ResultsRevealed events), personal stats. Activity Feed: live blockchain event stream, auto-refresh every 30s.

**3. Create** — 5-step wizard: title + IPFS description → Space selector + weighted voting toggle → options (with templates: Yes/No, Approve/Reject/Abstain) → duration + quorum → review + deploy. After MetaMask confirms, `ProposalCreated` event is parsed for the proposalId and a shareable link is generated.

**4. Vote** — Select option → "Encrypt & Submit" → FHE step visualizer shows each operation in sequence (asEuint32 → eq → select → mul → add → allowSender). Confetti on success. The encrypted tuple `{ctHash, securityZone, utype, signature}` is what goes on-chain — the option index is never transmitted in plaintext.

**5. Gasless Vote** — "Vote without gas" toggle → relayer submits EIP-712 signed meta-transaction, voter pays zero gas.

**6. Verify** — After voting, "Verify My Vote (FHE Decrypt)" → EIP-712 permit → `getMyVote()` → decrypt → "You voted: Option 2". Only visible to the voter.

**7. Wait** — Live countdown timer (days / hours / minutes / seconds). No intermediate tallies. Nobody sees how the vote is going.

**8. Reveal** — After deadline + quorum, anyone clicks "Reveal Results" → `FHE.allowPublic()` on each tally → decrypt with permit → animated bar charts with winner badge → Export JSON / Export CSV.

**9. Spaces** — My Spaces / Explore tabs. Create, join, leave, archive. Space-gated proposals visible inline. SpaceDetail: live member list, linked proposals with status.

**10. Treasury** — Deposit ETH (FHE.add), decrypt balance with EIP-712 permit (4-step reveal process: getTreasuryBalance tx → FHE.allowSender → EIP-712 permit → decryptForView). Propose allocations linked to proposals. Execute after vote passes.

**11. Delegation** — Set delegate address, encrypted power transferred via `FHE.add`. Undelegate reclaims via `FHE.select`. Leaderboard shows delegation count without revealing power amounts.

**12. Analytics** — Participation line chart, quorum donut, category bar chart, voter heatmap, top voters leaderboard. All from `getLogs`, no indexer, no backend.

**13. Discussion** — Post IPFS-pinned comments on any V2 proposal. CID stored on-chain. Content served via serverless IPFS gateway with schema validation and CDN caching.

**14. Settings** — Dark/light theme, voting defaults (quorum, duration), privacy settings, notification toggles. All persisted to localStorage. FHE shielded voting always active — shown as informational badge, not a toggle.

---

## What we learned

FHE makes truly private voting possible on-chain in a way that threshold encryption fundamentally can't. With threshold, you're trusting a committee. With FHE, there's no committee — the math itself prevents disclosure.

But it's not free. Gas costs scale with the number of FHE operations. Each option in a vote adds 3 operations. Building for real-world DAOs with thousands of proposals means careful batching (we fixed unbounded `Promise.all` reads to batch 50 at a time) and TTL caching (30s for proposals, 60s for spaces).

The CoFHE SDK is powerful but early-stage. Documentation is thin, error messages are cryptic, behavior changes between minor versions. The singleton pattern — one `_client` per browser session, reset only on wallet/chain change — was essential for correctness and performance.

Debugging encrypted state is a completely different discipline. You can't print values. You can't inspect storage. You write the logic, deploy, test end-to-end, and find out if it works 20 minutes later when you try to decrypt. Forced us to think very carefully before writing.

---

## Deployed contracts — Ethereum Sepolia

| Contract | Address | Wave | FHE Ops |
|----------|---------|------|---------|
| **ShadowVote.sol** | [`0x625b9b6cBd467E69b4981457e7235EBd2874EF86`](https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86) | 1–2 | 10: asEuint32, eq, select, add, gte, max, sub, allowThis, allowPublic, allowSender |
| **ShadowSpace.sol** | [`0x2B2A4370c5f26cB109D04047e018E65ddf413c88`](https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88) | 1–2 | — (DAO registry, cross-contract ACL) |
| **ShadowVoteV2.sol** | [`0xD8037F77d1D5764f3639A6216a580Cd608fB7fAA`](https://sepolia.etherscan.io/address/0xD8037F77d1D5764f3639A6216a580Cd608fB7fAA) | 3–5 | +FHE.mul (weighted), IPFS desc, discussion, EIP-712 gasless |
| **ShadowTreasury.sol** | [`0xc7E024c8259b4c0c9Cd3F5A7987E7E79ACf8b0db`](https://sepolia.etherscan.io/address/0xc7E024c8259b4c0c9Cd3F5A7987E7E79ACf8b0db) | 3 | euint32 balance, FHE.add/gte/sub/select, FHE.allowSender |
| **ShadowDelegate.sol** | [`0x2a896334a0B1263f397A45844a307D4cF90cb5f1`](https://sepolia.etherscan.io/address/0x2a896334a0B1263f397A45844a307D4cF90cb5f1) | 4 | FHE.add pool, FHE.select zero-out, FHE.allowSender |

Chain ID 11155111 · Solidity 0.8.25 · EVM Cancun

### How to verify FHE is real

1. **Etherscan** — View [contract source](https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86) → imports `@fhenixprotocol/cofhe-contracts/FHE.sol`
2. **Vote transaction** — Check input data → `ctHash` (encrypted handle), not a plaintext number
3. **Tally read** — Call `getEncryptedTally()` → returns FHE handle. Decrypt requires EIP-712 permit
4. **After reveal** — Only aggregate totals visible; individual votes remain as encrypted handles forever
5. **Treasury** — `getEthBalance()` is public; `getTreasuryBalance()` requires permit and a mined tx to set `FHE.allowSender`

---

## Wave completion

### Wave 1 ✅ — Core FHE Voting
ShadowVote.sol + ShadowSpace.sol deployed. FHE-encrypted ballots, homomorphic tallying, permissionless reveal, "Verify My Vote" via `FHE.allowSender`. **10 FHE operations.**

### Wave 2 ✅ — Spaces + Cross-Contract ACL
Space-gated voting — `vote()` enforces `IShadowSpace.isSpaceMember()` on-chain. Encrypted analytics: `FHE.gte`, `FHE.max`, `FHE.sub`. 60 E2E tests on Sepolia. Space lifecycle (join, leave, archive).

### Wave 3 ✅ — Treasury + Weighted Voting
ShadowTreasury.sol: `euint32` encrypted balance, deposit/withdraw/allocate. ShadowVoteV2.sol: `FHE.mul` weighted voting, IPFS description hash. FHE visualizer page. **14 FHE operations.**

### Wave 4 ✅ — Delegation + Analytics + Discussion
ShadowDelegate.sol: encrypted power delegation pool. On-chain IPFS comment hashes. Analytics dashboard from `getLogs`. Activity feed, proposal search with date range filter, pagination. **16 FHE operations.**

### Wave 5 ✅ — SDK + Gasless + PWA
`voteWithSignature()` EIP-712 meta-tx. `shadowdao-sdk` npm package with TypeScript clients + React hook. PWA service worker. Lazy-loaded routes. Error boundary. `TEMPLATE.md` integration guide.

---

## Run locally

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
npm run dev
```

Node.js 18+, MetaMask on Sepolia with test ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia)).

For Vercel API routes (IPFS comment pinning) to work locally, add to `.env.local`:

```
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=https://gateway.pinata.cloud
ALLOWED_ORIGIN=http://localhost:5173
```

### Run contract tests

```bash
# Set up .env with PRIVATE_KEY and PRIVATE_KEY_2
npm run test:live
```

Tests cover proposal creation, voting, reveal, cancel, extend deadline, quorum checks, double-vote prevention, Space lifecycle, cross-account authorization, FHE analytics functions.

---

## Architecture

```
contracts/
  ShadowVote.sol       ← Wave 1-2: core FHE voting + space-gated
  ShadowSpace.sol      ← Wave 1-2: DAO registry + ACL
  ShadowVoteV2.sol     ← Wave 3-5: weighted, IPFS, discussion, gasless
  ShadowTreasury.sol   ← Wave 3: encrypted treasury
  ShadowDelegate.sol   ← Wave 4: encrypted delegation

api/
  pin-comment.ts       ← Vercel Function: Pinata IPFS pin (JWT server-side)
  fetch-ipfs.ts        ← Vercel Function: IPFS gateway with 4-gateway fallback
  _ratelimit.ts        ← Sliding-window rate limiter (10/60s pin, 60/60s fetch)
  _utils.ts            ← CIDv0 ↔ bytes32 conversion (inline base58)

src/
  config/contract.ts   ← Single swap point: all 4 contract addresses + ABIs
  hooks/               ← useVote, useReveal, useProposals, useSpaces, useCofhe ...
  pages/               ← 14 pages, all React.lazy code-split
  components/UI.tsx    ← Pure UI components, zero business logic

sdk/                   ← shadowdao-sdk: ShadowVoteClient, ShadowSpaceClient, hook
```

**Data flow: everything from blockchain or IPFS.** No backend database. Settings and theme in localStorage. Governance data (proposals, votes, spaces, comments) exclusively on-chain or IPFS.

---

## License

MIT
