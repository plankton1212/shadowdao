# ShadowDAO — Hackathon Submission (Wave 2: Build)

## One-Line Description

Private on-chain DAO governance where votes are FHE-encrypted, tallied on ciphertext, and only aggregate results are ever revealed — powered by Fhenix CoFHE.

---

## The Problem We Solve

**DAO voting is broken by transparency.** Every major governance platform — Snapshot, Tally, Governor — makes all votes fully public. This creates real, daily problems:

1. **Voter coercion** — whales pressure smaller holders to vote their way, verifying compliance on-chain
2. **Frontrunning** — MEV bots act on visible vote momentum before proposals close
3. **Social pressure** — members vote with the majority because dissent is publicly visible
4. **Strategic last-minute voting** — participants wait to see which way votes lean, then pile on
5. **Vote buying** — since votes are verifiable, bad actors pay for outcomes and confirm delivery

**Who is affected:** Every DAO member, token holder, and protocol contributor who wants governance decisions to reflect genuine community sentiment rather than power dynamics.

**Why existing solutions fall short:** Snapshot's "shielded voting" uses threshold encryption — individual votes are revealed after voting ends. Commit-reveal schemes add UX friction and still expose votes eventually. Off-chain voting sacrifices verifiability. None provide true vote privacy with on-chain computation.

---

## Our Approach: FHE-Powered Private Governance

ShadowDAO uses **Fhenix CoFHE (Fully Homomorphic Encryption)** — a coprocessor running on top of standard EVM — to make votes **completely private** while keeping results **mathematically verifiable on-chain**.

The key insight: FHE allows smart contracts to perform arithmetic on encrypted data. The contract adds encrypted votes to encrypted tallies **without ever knowing what any individual voted for.** Only final aggregate totals are decrypted after the deadline. Individual votes remain encrypted **forever**.

### How a Vote Works (Technical Flow)

```
VOTER'S BROWSER                    SMART CONTRACT                  COFHE COPROCESSOR
───────────────                    ──────────────                  ─────────────────

1. Select option (e.g. "Yes")
2. CoFHE SDK encrypts choice
   → Encryptable.uint32(1)
3. SDK generates ZK proof
   → {ctHash, signature}
                          ──tx──>
                                   4. FHE.asEuint32(input)
                                      Convert to FHE type         → stores ciphertext
                                   5. For each option i:
                                      FHE.eq(vote, i)             → encrypted comparison
                                      FHE.select(match, 1, 0)     → encrypted if/else
                                      FHE.add(tally[i], result)   → encrypted addition
                                   6. FHE.allowSender(vote)       → voter can self-verify

                          ── after deadline ──

                                   7. FHE.allowPublic(tallies)    → unlock aggregates
                                   8. FHE.gte(total, quorum)      → encrypted quorum check
                                   9. FHE.max(tally[0], tally[1]) → find winner privately

VOTER'S BROWSER
───────────────
10. decryptForView(tally)
    → "Yes: 42 votes, No: 18 votes"
    Individual votes NEVER revealed
```

### What Cannot Work Without Fhenix FHE

These are **impossible** without FHE — there is no plaintext fallback:

- **Voting** — ballot encrypted in browser before on-chain submission
- **Tally accumulation** — `FHE.add()` on encrypted counters, contract never sees values
- **Vote verification** — `FHE.allowSender()` + EIP-712 permit lets voter verify own ballot
- **Result reveal** — `FHE.allowPublic()` unlocks only aggregate counts
- **Quorum validation** — `FHE.gte()` checks quorum on encrypted data
- **Winner detection** — `FHE.max()` finds highest tally without revealing any
- **Vote differential** — `FHE.sub()` computes margin without revealing counts

### What Works Without FHE

- Creating proposals (title and options are public metadata)
- Reading proposal metadata (deadline, quorum, voter count)
- Checking `hasUserVoted` (boolean — proves participation, not choice)

---

## Deep Fhenix Integration — 10 FHE Operations

ShadowDAO uses **10 distinct FHE operations** — one of the deepest Fhenix integrations in any project:

| # | Operation | Function | Purpose |
|---|-----------|----------|---------|
| 1 | `FHE.asEuint32()` | createProposal, vote | Convert to encrypted type |
| 2 | `FHE.eq()` | vote | Encrypted comparison: does vote match option? |
| 3 | `FHE.select()` | vote | Encrypted if/else: add 1 or 0 |
| 4 | `FHE.add()` | vote, checkQuorum | Add to encrypted tally (homomorphic addition) |
| 5 | `FHE.allowThis()` | createProposal, vote | Grant contract access to encrypted data |
| 6 | `FHE.allowSender()` | vote | Let voter verify own encrypted ballot |
| 7 | `FHE.allowPublic()` | revealResults | Make aggregate tallies publicly decryptable |
| 8 | `FHE.gte()` | checkQuorumEncrypted | Encrypted "total votes >= quorum?" check |
| 9 | `FHE.max()` | getEncryptedMaxTally | Find highest tally without revealing any |
| 10 | `FHE.sub()` | getEncryptedDifferential | Encrypted margin of victory |

**Encrypted types used:** `euint32` (vote tallies), `ebool` (comparison results), `InEuint32` (browser-encrypted input)

**Frontend SDK integration:**
- `@cofhe/sdk` — browser-side encryption with TFHE WASM engine
- `Encryptable.uint32()` + `encryptInputs().execute()` — encrypt + ZK proof
- `decryptForView().withPermit().execute()` — permit-gated decryption
- `permits.getOrCreateSelfPermit()` — EIP-712 permit creation

---

## Key Features

### Implemented & Working

| Feature | Description | Fhenix FHE Used |
|---------|-------------|-----------------|
| **FHE-Encrypted Voting** | Ballot encrypted in browser, ZK proof generated, submitted on-chain | `Encryptable.uint32`, `encryptInputs`, `FHE.eq`, `FHE.select`, `FHE.add` |
| **Homomorphic Tallying** | Contract counts votes on encrypted data | `FHE.add` on `euint32` counters |
| **Time-Locked Results** | Nobody sees results until deadline passes | Tallies stored as `euint32` |
| **Permissionless Reveal** | Anyone triggers reveal after deadline + quorum | `FHE.allowPublic` |
| **Verify My Vote** | Voter privately decrypts own ballot | `FHE.allowSender`, `decryptForView`, EIP-712 permit |
| **Encrypted Quorum Check** | Validate quorum without revealing vote count | `FHE.gte` |
| **Private Winner Detection** | Find winning option without revealing any tallies | `FHE.max` |
| **Encrypted Vote Differential** | Compute margin of victory on encrypted data | `FHE.sub` |
| **DAO Spaces** | On-chain DAO registry with members, categories, lifecycle | ShadowSpace.sol |
| **Spaces Navigation** | My Spaces / Explore tabs; Spaces in main nav and MobileTabBar (5 tabs) | — |
| **Leave / Archive Space** | Members can leave; creator can archive; full array cleanup on-chain | ShadowSpace.sol `leaveSpace`, `archiveSpace` |
| **Personal Dashboard Stats** | My Votes Cast, My Spaces count, My Spaces sidebar widget | `getUserVotes`, `getUserSpaceIds` |
| **Confetti Vote Confirmation** | Animated confetti fires on successful vote transaction | — |
| **FHE Step Visualizer** | Live per-operation progress with FheBadge labels during voting flow | `asEuint32 → eq → select → add → allowSender` |
| **Creator Admin Controls** | Cancel (pre-vote), extend deadline | On-chain access control |
| **Real-Time Notifications** | Live event feed from blockchain | `getLogs` for events |
| **Live Countdown Timer** | Real-time HH:MM:SS on active proposals | — |
| **Proposal Templates** | Yes/No, Approve/Reject/Abstain, Multiple Choice | — |
| **Export Results** | Download JSON/CSV after reveal | — |

### Planned (Waves 3-5)

| Wave | Feature | Fhenix FHE |
|------|---------|------------|
| 2 | Member-only voting in Spaces | *(completed — `setShadowVoteContract` ACL)* |
| 3 | Weighted voting (token balance = power) | `FHE.mul(vote, weight)` |
| 3 | Encrypted treasury balance | `euint64`, `FHE.gte` solvency check |
| 4 | Encrypted delegation | `FHE.allow(delegate_address)` |
| 4 | Anonymous proposals | `eaddress` encrypted proposer |
| 5 | Quadratic voting | `FHE.square()` for weight curves |
| 5 | On-chain randomness | `FHE.randomEuint32()` for option ordering |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **FHE Engine** | Fhenix CoFHE coprocessor | FHE operations on top of standard EVM |
| **FHE SDK** | @cofhe/sdk 0.4.0 | Browser-side encryption, ZK proofs, permits |
| **FHE Contracts** | @fhenixprotocol/cofhe-contracts 0.1.0 | Solidity FHE types (euint32, ebool, InEuint32) |
| **Smart Contracts** | Solidity 0.8.25 (EVM: Cancun) | On-chain governance logic |
| **Frontend** | React 19 + TypeScript + Vite 6 | Modern SPA with 14 pages |
| **Styling** | Tailwind CSS 4 + Motion 12 | Animations, skeleton loading |
| **Wallet** | wagmi 3 + viem 2 | MetaMask, Sepolia enforcement |
| **Build** | Hardhat + @cofhe/hardhat-plugin | Compile + deploy FHE contracts |
| **Deploy** | Vercel | COOP/COEP headers for WASM |
| **Testing** | 40 E2E tests on Sepolia | Full function coverage, 2-account tests |

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address | FHE Operations |
|----------|---------|---------------|
| **ShadowVote.sol** | [`0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5`](https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5) | 10 FHE ops (asEuint32, eq, select, add, gte, max, sub, allowThis, allowPublic, allowSender) |
| **ShadowSpace.sol** *(Wave 2 upgrade)* | [`0x2B2A4370c5f26cB109D04047e018E65ddf413c88`](https://sepolia.etherscan.io/address/0x2B2A4370c5f26cB109D04047e018E65ddf413c88) | DAO registry (no FHE — membership is public) |

---

## Expected User Experience

1. **Connect** — MetaMask on Sepolia
2. **Dashboard** — Active proposals from blockchain, skeleton loading, live notifications. Personal stats: My Votes Cast and My Spaces count. My Spaces sidebar widget.
3. **Create** — 4-step wizard: title → options (with templates) → duration/quorum → deploy on-chain
4. **Vote** — Select option → "Encrypt & Submit" → FHE step visualizer shows each operation with FheBadge labels (asEuint32 → eq → select → add → allowSender) → ZK proof → on-chain. Confetti on success.
5. **Verify** — "Verify My Vote" button → EIP-712 permit → decrypt own ballot → "You voted: Option 1" (only visible to voter)
6. **Wait** — Live countdown timer. No intermediate results visible to anyone
7. **Reveal** — After deadline + quorum → "Reveal Results" → `FHE.allowPublic()` → animated bar charts → winner badge → export JSON/CSV
8. **Spaces** — My Spaces tab (your DAOs) and Explore tab (all public Spaces). Leave Space or Archive Space from SpaceDetail. CategoryEmoji icons per Space type.

**All data from blockchain. No backend, no database, no localStorage.**

---

## What Makes This Different

| | Snapshot | ShadowDAO |
|--|---------|-----------|
| Privacy | Optional add-on | **Default, mandatory** |
| Encryption | Threshold (reveals after voting) | **FHE (individual votes never revealed)** |
| Computation | Off-chain (IPFS) | **On-chain (EVM + CoFHE coprocessor)** |
| Tallying | Decrypt all, count in cleartext | **Count on encrypted data (homomorphic)** |
| After reveal | All individual votes public | **Only aggregates public, votes stay encrypted forever** |
| Quorum check | Count public votes | **FHE.gte on encrypted total** |
| Winner detection | Compare public counts | **FHE.max on encrypted tallies** |
| FHE operations | 0 | **10 distinct operations** |

---

## Verification

### How to verify FHE is real:

1. **Etherscan** — View [contract source](https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5) → imports `@fhenixprotocol/cofhe-contracts/FHE.sol`
2. **Vote transaction** — Check input data → `ctHash` (encrypted), not a plaintext number
3. **Tally read** — Call `getEncryptedTally()` → returns FHE handle, not a count
4. **After reveal** — Only aggregate totals visible; individual votes remain as encrypted handles forever
5. **Run tests** — `npm test` → 40 tests on Sepolia, including FHE.gte, FHE.max, FHE.sub execution

---

## Links

- **Live Demo:** https://shadowdao.vercel.app
- **GitHub:** https://github.com/plankton1212/shadowdao
- **Fhenix CoFHE Docs:** https://cofhe-docs.fhenix.zone
- **Contract on Etherscan:** https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5
