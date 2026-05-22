# ShadowDAO — Project Deep-Dive

> Extended technical detail. For the overview, start with the
> [README](../README.md). Wave 5 coercion-resistance specifics live in
> [COERCION-RESISTANCE.md](COERCION-RESISTANCE.md).

---

## What it does

Ever voted in a DAO and felt like you were being watched? That's because you were.
Every Snapshot vote, every Governor ballot — it's all public. Everyone sees what
you picked.

ShadowDAO fixes that. You vote, your ballot gets FHE-encrypted right in the
browser before it even hits the chain. The smart contract counts votes *on the
ciphertext* — it literally adds numbers it can't read. When the deadline passes
and quorum is met, anyone can trigger the reveal. But here's the thing: only the
totals get decrypted. Your individual vote stays encrypted forever.

The flow is: pick an option → CoFHE SDK encrypts it as `euint32` + generates a ZK
proof → the encrypted tuple goes on-chain → the contract runs `FHE.eq` +
`FHE.select` + `FHE.add` for each option to tally without seeing anything → after
the deadline, `FHE.allowPublic` makes the aggregate readable.

And the ballot is **receipt-free** (Wave 5): ShadowDAO stores no decryptable copy
of your vote and grants no FHE permit over it. You can confirm your vote was
*recorded*, but nobody — not even you — can prove *which* option you picked.
There is no receipt to sell or to be forced to show. That is what makes the vote
coercion-resistant.

**All 5 waves are complete.** 6 contracts deployed on Sepolia. FHE integration
spanning 5 encrypted contracts.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VOTE LIFECYCLE                               │
│                                                                  │
│  Browser                    Contract               CoFHE         │
│  ───────                    ────────               ─────         │
│                                                                  │
│  1. Pick option                                                  │
│  2. Encryptable.uint32() ──>  3. FHE.asEuint32()                 │
│     + ZK proof                                                   │
│                               4. for each option i:              │
│                                  FHE.eq(vote, i)   ── compute ── │
│                                  FHE.select(match)  ── compute ──│
│                                  FHE.mul(inc, power)── compute ──│  ← V2 weighted
│                                  FHE.add(tally, inc)── compute ──│
│                                                                  │
│                               5. ballot consumed into tally,     │
│                                  then discarded — receipt-free   │
│                                                                  │
│         ═══ DEADLINE PASSES ═══                                  │
│                                                                  │
│                               6. FHE.allowPublic()  ── unlock ── │
│                                                                  │
│  7. decryptForView() <────── 8. Return aggregate                 │
│     with EIP-712 permit         counts only                      │
│                                                                  │
│  Individual votes stay encrypted. Forever. No exceptions.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Challenges I ran into

**The COOP/COEP + MetaMask fight.** CoFHE SDK needs SharedArrayBuffer for WASM
workers, which requires Cross-Origin headers. But `require-corp` breaks
MetaMask's iframe injection. Ended up using `credentialless` instead, which works
but means the SDK falls back to single-threaded mode. It's slower but actually
works.

**CoFHE SDK is pre-1.0 and it shows.** The `WagmiAdapter` function signature
changed between patch versions. `walletClient.getAddresses()` stopped working in
some configurations. Built a fallback chain: try WagmiAdapter → catch → try
direct connect → catch → retry without workers. Also built a module-level
singleton so only one CoFHE client ever exists per browser session, with
wallet-address and chain-ID tracking to reset it when the account switches.

**Gas scales linearly with options.** Each `vote()` call runs a loop: for every
option, it does `FHE.eq` + `FHE.select` + `FHE.add`. A 2-option proposal costs
~1.2M gas. 5 options costs ~2.8M. 10 options pushes toward 5M. There's no way
around it — the contract has to touch every encrypted tally.

**Debugging encrypted state is pain.** When `FHE.add` silently does nothing
because you forgot `FHE.allowThis`, there's no error. The tally just stays at
zero. You can't `console.log` an `euint32`. You find out 20 minutes later when
reveal shows all zeros. Had to develop a mental model of "what does the contract
think it's holding" without ever being able to check.

**Non-ASCII in Solidity.** Em dashes in comments broke the Solidity compiler with
"Invalid character in string." Had to write a Node.js script to strip all
non-ASCII from contracts before compilation.

**BigInt vs Number in TypeScript.** `SHADOWVOTEV2_ADDRESS as const` created a
literal type — TypeScript refused comparisons like `addr !== ZERO_ADDRESS`
("types have no overlap"). Fixed by using `` as `0x${string}` `` instead of
`as const`.

**Permit system quirks.** CoFHE requires an active EIP-712 permit before
`decryptForView` works. If you call decrypt without first calling
`getOrCreateSelfPermit`, you get a cryptic "Active permit not found" error. Not
documented anywhere — had to read the SDK source. Added a debounce guard so rapid
clicks don't open multiple MetaMask signature dialogs.

**Wave 5 — ZK field-size mismatch.** A CoFHE `ctHash` is a full 256-bit value; a
Semaphore proof's `message` must be a SNARK scalar-field element (~254 bits). The
anonymous-vote proof binds `scope = message = proposalId` — a small counter
that's always a valid field element — instead of the raw ciphertext handle.

---

## How we built it

### Phase 1 — The voting contract

Started with the core question: how do you count votes without knowing what they
are? The answer is a loop. For each option in a proposal, keep an encrypted
counter initialized to `FHE.asEuint32(0)`. When someone votes, their choice
arrives as an encrypted `euint32` from the browser. The contract checks every
option: `FHE.eq(vote, optionIndex)`. If it matches, `FHE.select` returns an
encrypted 1, otherwise encrypted 0. Then `FHE.add` adds that to the tally.

```solidity
for (uint8 i = 0; i < proposal.optionCount; i++) {
    ebool isMatch = FHE.eq(option, FHE.asEuint32(i));
    euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
    tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], increment);
    FHE.allowThis(tallies[_proposalId][i]);
}
```

### Phase 2 — DAO Spaces + cross-contract ACL

Built `ShadowSpace.sol` — an on-chain DAO registry with 8 crypto-specific
categories. Wave 2 added `leaveSpace`, `archiveSpace`, a `setShadowVoteContract`
ACL (fixing unbounded `incrementProposalCount`), and space-gated voting: `vote()`
enforces membership via a cross-contract call to `IShadowSpace.isSpaceMember()`.
Added three FHE analytics functions: `FHE.gte` quorum check, `FHE.max` winner
detection, `FHE.sub` vote differential.

### Phase 3 — Encrypted Treasury + Weighted Voting

`ShadowTreasury.sol`: DAO balance as `euint32` (milliETH units). `deposit()` via
`FHE.add`. `withdraw()` with an `FHE.gte` encrypted solvency check + `FHE.select`
safe subtraction. Allocations linked to ShadowVote proposals — execute
automatically after reveal + quorum.

`ShadowVoteV2.sol`: weighted voting via `FHE.mul(vote, power)`. IPFS description
hash stored as `bytes32` per proposal.

### Phase 4 — Delegation + Discussion + Analytics

`ShadowDelegate.sol`: `delegate(to, encryptedPower)` accumulates power into a
delegate's encrypted pool via `FHE.add`. `undelegate()` zeroes the contribution
with `FHE.select`. The leaderboard shows delegation counts (public) without
revealing amounts.

On-chain discussion: `postComment(proposalId, bytes32)` stores IPFS CID hashes per
proposal. Comment text is served via Vercel serverless functions → Pinata gateway
— the Pinata JWT never touches the browser.

Analytics: participation line chart, quorum donut, category bars, voter heatmap,
top voters — all computed from `getLogs`, no indexer, no backend.

### Phase 5 — SDK + Gasless + PWA

`voteWithSignature()` in ShadowVoteV2: an EIP-712 signed meta-transaction, relayer
pays gas, voter signs offline. A per-address nonce prevents replay.
`shadowdao-sdk` npm package: `ShadowVoteClient`, `ShadowSpaceClient`,
`useShadowVote` React hook. PWA: `manifest.json` + service worker + offline
fallback. All 14 routes lazy-loaded with an `ErrorBoundary`.

### Phase 5 (final) — Coercion Resistance

The decisive step: encrypting the ballot is not enough — the *voter* must be
protected too. Receipt-freeness removed `getMyVote()` and the per-ballot
`FHE.allowSender`, so a vote can no longer be proven. Anonymous voting added a
Semaphore zero-knowledge group per Space and a `voteAnonymous()` path that
verifies a membership proof + nullifier instead of an address — routed through a
relayer so the wallet never appears on-chain. `ShadowToken`, a confidential
FHERC20, made weighted-voting power trustless. Full detail:
[COERCION-RESISTANCE.md](COERCION-RESISTANCE.md).

---

## FHE operations — detailed

| # | Operation | Where | What it does |
|---|-----------|-------|-------------|
| 1 | `FHE.asEuint32()` | Vote, V2, Treasury, Delegate, Token | Convert browser-encrypted input to on-chain FHE type |
| 2 | `FHE.eq()` | Vote, V2 | Encrypted equality: does this vote match option i? |
| 3 | `FHE.select()` | Vote, V2, Treasury, Delegate, Token | Encrypted if/else; safe zero-out |
| 4 | `FHE.add()` | All 5 FHE contracts | Homomorphic addition: tally, balance, delegation pool, token balance |
| 5 | `FHE.allowThis()` | All 5 FHE contracts | Contract retains access to ciphertext across transactions |
| 6 | `FHE.allowSender()` | V2, Treasury | Permit-gated decryption of aggregates — never an individual ballot |
| 7 | `FHE.allowPublic()` | Vote, V2 | Unlock aggregate tallies for public decryption after reveal |
| 8 | `FHE.gte()` | Vote, V2, Treasury, Token | Encrypted ≥: quorum check + solvency gate |
| 9 | `FHE.max()` | Vote, V2 | Find leading option without revealing any tally |
| 10 | `FHE.sub()` | Vote, V2, Treasury, Delegate, Token | Subtraction: margin, balance decrement, power removal |
| 11 | `FHE.mul()` | ShadowVoteV2 | Weighted voting: multiply ballot by encrypted voting power |
| 12 | `FHE.allow()` | ShadowToken → V2 | Cross-contract grant: encrypted token balance becomes voting power |

**Encrypted types:** `euint32` (tallies, balances, voting power), `ebool`
(comparisons), `InEuint32` (browser inputs).

### What genuinely requires Fhenix FHE

| Feature | FHE operations | Without FHE |
|---------|---------------|------------|
| Casting a vote | `asEuint32`, `eq`, `select`, `add`, `allowThis` | Option visible on-chain |
| Receipt-free ballot | no per-voter copy, no ballot permit | A briber could verify and pay |
| Weighted ballot | `mul(vote, power)` | Power amounts visible |
| Revealing results | `allowPublic` | Tallies exposed before deadline |
| Quorum check | `gte(totalVotes, quorum)` | Vote count visible during voting |
| Winner detection | `max(tally[0], tally[1])` | Leading option visible mid-vote |
| Treasury balance | `add`, `gte`, `sub`, `allowSender` | Balance visible on Etherscan |
| Delegation pool | `add(pool, power)`, `select` zero-out | Power amounts visible |
| Confidential token | `add`, `sub`, `gte`, `select`, `allow` | Holdings public, vote-weight gameable |

What works without FHE: creating proposals, reading metadata (deadline, quorum,
voter count), the `hasUserVoted` boolean, Space creation/membership, comment
authorship timestamps.

---

## User experience — the 14-page dApp

**1. Connect** — MetaMask on Sepolia. Wrong network is auto-detected with a
one-click switch.

**2. Dashboard** — Active proposals, a live notification bell (VoteCast /
ProposalCreated / ResultsRevealed events), personal stats. Activity Feed: a live
blockchain event stream, auto-refreshing every 30s.

**3. Create** — A 5-step wizard: title + IPFS description → Space selector +
weighted-voting toggle + **anonymous-voting toggle** → options (templates: Yes/No,
Approve/Reject/Abstain) → duration + quorum → review + deploy. After MetaMask
confirms, the `ProposalCreated` event is parsed for the proposalId and a
shareable link is generated.

**4. Vote** — Select an option → "Encrypt & Submit" → an FHE step visualizer shows
each operation in sequence. The encrypted tuple `{ctHash, securityZone, utype,
signature}` is what goes on-chain — the option index is never transmitted in
plaintext.

**5. Gasless Vote** — A "Vote without gas" toggle → the relayer submits an EIP-712
signed meta-transaction, the voter pays zero gas.

**6. Confirm (receipt-free)** — After voting you see a receipt-free confirmation:
"Your vote is recorded." Participation is publicly verifiable on-chain, but
neither you nor anyone else can decrypt *which* option you chose — that is what
makes the ballot coercion-resistant.

**7. Wait** — A live countdown timer. No intermediate tallies. Nobody sees how the
vote is going.

**8. Reveal** — After deadline + quorum, anyone clicks "Reveal Results" →
`FHE.allowPublic()` on each tally → decrypt with permit → animated bar charts with
a winner badge → Export JSON / CSV.

**9. Spaces** — My Spaces / Explore tabs. Create, join, leave, archive.
Space-gated proposals visible inline. SpaceDetail: live member list, linked
proposals with status.

**10. Treasury** — Deposit ETH (`FHE.add`), decrypt the balance with an EIP-712
permit. Propose allocations linked to proposals. Execute after a vote passes.

**11. Delegation** — Set a delegate address; encrypted power transferred via
`FHE.add`. Undelegate reclaims via `FHE.select`. Leaderboard shows the delegation
count without revealing power amounts.

**12. Analytics** — Participation line chart, quorum donut, category bar chart,
voter heatmap, top-voters leaderboard. All from `getLogs` — no indexer, no
backend.

**13. Discussion** — Post IPFS-pinned comments on any V2 proposal. The CID is
stored on-chain; content is served via a serverless IPFS gateway with caching.

**14. Settings** — Dark/light theme, voting defaults, privacy settings,
notification toggles — persisted to `localStorage`.

**Anonymous voting** — On an anonymous proposal, the voter first registers a
zero-knowledge identity for the Space, then casts a vote whose eligibility is
proven by a Semaphore proof. See [COERCION-RESISTANCE.md](COERCION-RESISTANCE.md).

---

## What we learned

FHE makes truly private voting possible on-chain in a way that threshold
encryption fundamentally can't. With threshold, you're trusting a committee. With
FHE, there's no committee — the math itself prevents disclosure.

But it's not free. Gas costs scale with the number of FHE operations. Each option
in a vote adds 3 operations. Building for real-world DAOs with thousands of
proposals means careful batching (we batch `getLogs`/read calls 50 at a time) and
TTL caching (30s for proposals, 60s for spaces).

The CoFHE SDK is powerful but early-stage. Documentation is thin, error messages
are cryptic, behavior changes between minor versions. The singleton pattern — one
`_client` per browser session, reset only on wallet/chain change — was essential
for correctness and performance.

Debugging encrypted state is a completely different discipline. You can't print
values. You can't inspect storage. You write the logic, deploy, test
end-to-end, and find out if it works 20 minutes later when you try to decrypt.
That forced very careful thinking before writing.

And the biggest lesson of Wave 5: *confidential* is not the same as
*coercion-resistant*. Hiding the ballot is necessary but not sufficient — the
voter, the receipt, and the source of voting power all have to be closed too.
