<p align="center">
  <img src="public/logo.svg" width="84" height="84" alt="ShadowDAO" />
</p>

<h1 align="center">ShadowDAO</h1>

<p align="center"><b>The first coercion-resistant DAO governance protocol —<br/>FHE-encrypted voting on Fhenix.</b></p>

<p align="center">
  <a href="https://shadowdao.vercel.app">🌐 Live Demo</a> ·
  <a href="docs/COERCION-RESISTANCE.md">🔐 Threat Model</a> ·
  <a href="HACKATHON.md">📋 Submission</a> ·
  <a href="https://cofhe-docs.fhenix.zone">📖 Fhenix Docs</a>
</p>

<p align="center">
  <code>Sepolia</code> · <code>6 contracts live</code> · <code>12 FHE primitives</code> · <code>Semaphore ZK</code> · <code>14-page dApp + SDK</code>
</p>

---

ShadowDAO is on-chain DAO governance where **the vote, the voter, and the voter's
stake are all encrypted**. Ballots are encrypted in the browser with Fhenix
**Fully Homomorphic Encryption**; the contract tallies them *on ciphertext* and
never sees a single choice. Wave 5 closes the last gap — votes are now
**receipt-free** and **anonymous** (zero-knowledge eligibility), so a vote can no
longer be observed, bought, or coerced.

> **Track:** Confidential Governance — *coercion-resistant voting & private DAO coordination.*

---

## 📌 At a glance — for judges

| | |
|---|---|
| **What** | Confidential, coercion-resistant DAO governance protocol |
| **Built on** | Fhenix CoFHE (FHE coprocessor) + Semaphore v4 (ZK) |
| **Live** | 6 contracts deployed & wired on Ethereum Sepolia — all Etherscan-verifiable |
| **FHE depth** | 12 distinct FHE primitives across 5 encrypted contracts |
| **Product** | 14-page dApp, reusable npm SDK, gasless relayer, PWA |
| **Progress** | 5 waves shipped — each builds on the last (see [progress](#-progress-across-waves)) |
| **This wave** | Wave 5 — **coercion resistance**: receipt-free ballots + anonymous ZK voting + confidential governance token |

---

## 🎯 The problem

Public blockchains made governance *transparent by default* — and that quietly broke it:

- **Coercion** — a whale or employer says "vote my way, I can check." On a transparent chain, they can.
- **Vote-buying** — when every ballot is on-chain, a briber can *verify* compliance before paying. The market clears.
- **Whale pressure & conformity** — minority voters are visible, so they self-censor.
- **MEV / front-running** — bots read live vote momentum and trade the outcome.
- **The institutional gap** — funds with compliance requirements *cannot* deploy on rails where every position is public.

Snapshot's "shielded voting" uses threshold encryption — every individual vote is
**decrypted and made public after the deadline**. That is delayed transparency,
not privacy. The root cause is unaddressed: **transparent voting makes people
optimize for consequences instead of honest preference.**

## 💡 The solution — three layers of privacy

ShadowDAO is the only design that closes **all three**:

| Layer | Question | How ShadowDAO answers it |
|---|---|---|
| **Ballot secrecy** | Can anyone read *what* you voted? | FHE — the tally is computed on ciphertext; individual votes are *never* decrypted |
| **Receipt-freeness** | Can *you* prove your vote to a briber? | No decryptable copy is stored, no permit granted over a ballot — proof is impossible |
| **Voter anonymity** | Can anyone see *that you* voted? | Semaphore zero-knowledge eligibility + a gasless relayer — your address never touches the chain |

Full threat model: **[docs/COERCION-RESISTANCE.md](docs/COERCION-RESISTANCE.md)**.

---

## ⭐ Killer features

- 🔒 **Confidential FHE voting** — ballots encrypted client-side; the contract runs `FHE.eq → FHE.select → FHE.add` to tally *without ever decrypting a vote*. Only aggregate totals are revealed, after the deadline.
- 🧾 **Receipt-free ballots** *(Wave 5)* — the contract keeps **no** decryptable per-voter copy and grants **no** FHE permit over a ballot. You cannot prove how you voted — so nobody can buy or coerce it.
- 🥷 **Anonymous voting** *(Wave 5)* — prove DAO membership with a **Semaphore zero-knowledge proof** + per-proposal nullifier. The contract verifies eligibility without learning *who* you are; routed through the gasless relayer, your wallet address never appears on-chain.
- 🪙 **Confidential governance token** *(Wave 5)* — `ShadowToken`, an FHERC20 with **encrypted `euint32` balances**. Weighted-voting power is derived trustlessly from your encrypted balance — not assigned by an admin.
- 💸 **Gasless voting** — EIP-712 meta-transactions; a relayer pays gas, you sign offline.
- 🏦 **Encrypted treasury** — DAO balance lives as a `euint32` ciphertext; solvency checks run on encrypted data (`FHE.gte`).
- 🤝 **Encrypted delegation** — delegated voting power accumulates in an encrypted pool; the leaderboard ranks delegates without revealing amounts.
- 🧰 **Reusable SDK** — `shadowdao-sdk`: drop-in TypeScript clients + React hook so any team can add FHE voting in ~30 min.
- 🖥️ **Complete product** — 14-page dApp, live event feed, analytics dashboard, on-chain discussion, PWA, dark mode.

---

## 🔐 Wave 5 spotlight — Coercion Resistance

Encrypting the *ballot* is not enough. A vote is only coercion-resistant if it
cannot be **observed**, **bought**, or **compelled**. Wave 5 delivers all three.

**1 · Receipt-freeness** — `ShadowVoteV2._castVote` no longer stores a per-voter
ballot copy and no longer calls `FHE.allowSender` on a ballot. `getMyVote()` is
removed. A briber has nothing to verify → the vote-buying market cannot clear.

**2 · Anonymous eligibility (ZK)** — every Space runs a **Semaphore group**.
A member registers a zero-knowledge identity, then `voteAnonymous()` verifies a
Semaphore membership proof + nullifier. The contract learns *"an eligible member
voted"* — never *which* member. No KYC, no trusted authority — membership is
fully on-chain.

**3 · Anonymous transport** — the anonymous vote is relayed through
`/api/relay-anon-vote`, so the voter's address never appears even as
`msg.sender`. The Wave-3 gasless relayer is reused as the anonymity layer.

**4 · Trustless weight** — `ShadowToken` (confidential FHERC20) replaces
admin-assigned voting power: weight is your own **encrypted** token balance.

| Attack | Before Wave 5 | After Wave 5 |
|---|---|---|
| Read a ballot on-chain | ❌ blocked (FHE) | ❌ blocked |
| Make the voter *prove* their vote | ⚠️ possible (`getMyVote` + permit) | ❌ **blocked — receipt-free** |
| See *that* an address voted | ⚠️ possible | ❌ **blocked — ZK + relayer** |
| Game weighted voting via admin | ⚠️ admin-set power | ❌ **trustless — encrypted token balance** |

---

## 🧬 Fhenix FHE integration

The whole protocol is built *on* FHE — it is not a feature bolted on. **12 distinct
FHE primitives** run across **5 encrypted contracts**:

| FHE primitive | Used in | Purpose |
|---|---|---|
| `FHE.asEuint32` | all 5 | Convert a browser-encrypted input into an on-chain ciphertext |
| `FHE.eq` | ShadowVote, V2 | Encrypted equality — does this ballot match option *i*? |
| `FHE.select` | Vote, V2, Treasury, Delegate, Token | Encrypted if/else — branchless, leak-free |
| `FHE.add` | all 5 | Homomorphic addition — tallies, balances, delegation pool |
| `FHE.sub` | Vote, V2, Treasury, Delegate, Token | Encrypted subtraction — margins, balance decrement |
| `FHE.mul` | ShadowVoteV2 | Weighted voting — ballot × encrypted voting power |
| `FHE.gte` | Vote, V2, Treasury, Token | Encrypted ≥ — quorum check, solvency gate |
| `FHE.max` | ShadowVote, V2 | Leading option without revealing any tally |
| `FHE.allowThis` | all 5 | Contract retains ciphertext access across transactions |
| `FHE.allowSender` | V2, Treasury | Permit-gated decryption of **aggregates only** — never a ballot |
| `FHE.allowPublic` | ShadowVote, V2 | Unlock aggregate tallies after the deadline |
| `FHE.allow` | ShadowToken → V2 | Cross-contract grant — encrypted balance becomes voting power |

**Encrypted types:** `euint32` (tallies, balances, voting power), `ebool` (comparisons), `InEuint32` (browser inputs).

### What genuinely requires FHE

| Capability | Without FHE |
|---|---|
| Casting a vote | Your choice is public on-chain |
| Receipt-free ballot | A briber can verify and pay |
| Encrypted tally / quorum | Live vote count leaks, enabling front-running |
| Encrypted treasury balance | DAO balance fully visible on Etherscan |
| Encrypted delegation & weighted voting | Power amounts public |
| Confidential token balances | Holdings public, vote-weight gameable |

---

## 🔗 Integrations & tech stack

| Layer | Technology | Role |
|---|---|---|
| **FHE engine** | Fhenix **CoFHE** coprocessor | FHE operations on top of standard EVM — no separate chain |
| **FHE SDK** | `@cofhe/sdk` 0.5 | Browser-side encryption, ZK input proofs, EIP-712 permits |
| **FHE contracts** | `@fhenixprotocol/cofhe-contracts` | Solidity `euint32` / `ebool` / `InEuint32` |
| **Zero-knowledge** | **Semaphore v4** (`@semaphore-protocol/*`) | Anonymous membership proofs + nullifiers |
| **Contracts** | Solidity 0.8.25 (EVM Cancun) | 6 contracts on Sepolia |
| **Frontend** | React 19 · TypeScript · Vite 6 | 14 lazy-loaded pages |
| **Styling** | Tailwind CSS 4 · Motion 12 | Animations, dark mode |
| **Wallet** | wagmi 3 · viem 2 | Type-safe contract calls |
| **IPFS** | Pinata via Vercel serverless | On-chain discussion (CID on-chain, JWT server-side) |
| **Relayers** | Vercel serverless | Gasless EIP-712 voting + anonymous-vote transport |
| **Hosting** | Vercel | COOP/COEP headers for WASM, API routes |

---

## 📜 Deployed contracts — Ethereum Sepolia

All live, wired, and verifiable on Etherscan (Chain ID `11155111` · Solidity `0.8.25`).

| Contract | Address | Role |
|---|---|---|
| **ShadowVoteV2** | [`0xA45AD263…44fBaDa`](https://sepolia.etherscan.io/address/0xA45AD263C91c365b3F8170ebba8FCda7944fBaDa) | Core voting — FHE tally, weighted votes, **receipt-free + anonymous ZK voting**, gasless |
| **ShadowSpace** | [`0x96F2AEa4…3f4E299E`](https://sepolia.etherscan.io/address/0x96F2AEa4c7Cf81D47AF0A6fBDC1eAe7E3f4E299E) | DAO registry + cross-contract ACL + **per-space Semaphore groups** |
| **ShadowToken** | [`0x9a86031C…6eD5b238`](https://sepolia.etherscan.io/address/0x9a86031C1392033007eA928Fd6166B0C6eD5b238) | **Confidential FHERC20** — encrypted balances, trustless voting power |
| **ShadowTreasury** | [`0xc7E024c8…ACf8b0db`](https://sepolia.etherscan.io/address/0xc7E024c8259b4c0c9Cd3F5A7987E7E79ACf8b0db) | Encrypted DAO treasury — `euint32` balance, encrypted solvency |
| **ShadowDelegate** | [`0x2a896334…cF90cb5f1`](https://sepolia.etherscan.io/address/0x2a896334a0B1263f397A45844a307D4cF90cb5f1) | Encrypted vote delegation pool |
| **ShadowVote** (V1) | [`0x625b9b6c…2874EF86`](https://sepolia.etherscan.io/address/0x625b9b6cBd467E69b4981457e7235EBd2874EF86) | Wave 1–2 core voting contract |

**External dependency:** Semaphore v4 — `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` (deployed by the Semaphore team; same address on every chain).

### Verify FHE is real
1. **Etherscan** → contract source imports `@fhenixprotocol/cofhe-contracts/FHE.sol`.
2. **A vote tx** → input data is a `ctHash` (ciphertext handle), not a plaintext option.
3. **`getEncryptedTally()`** → returns an FHE handle; decryption needs an EIP-712 permit.
4. **After reveal** → only aggregate totals decrypt; individual ballots stay encrypted forever.

---

## 🧭 How it works

```
 Browser                         ShadowVoteV2 (Sepolia)              Fhenix CoFHE
 ───────                         ─────────────────────               ───────────
 1. Pick an option
 2. CoFHE SDK encrypts it    ──>  3. FHE.asEuint32(input)
    as euint32 + ZK proof
                                 4. for each option i:
                                    FHE.eq(vote, i)        ───────>   compute on
                                    FHE.select(match,1,0)  ───────>   ciphertext
                                    FHE.add(tally, inc)    ───────>   (never decrypted)
                                 5. ballot consumed & discarded
                                    → receipt-free, no copy kept

      ═══════════ DEADLINE PASSES + QUORUM MET ═══════════

                                 6. FHE.allowPublic(tally)  ──────>   unlock totals
 7. decryptForView(tally)   <──  8. aggregate counts only
    (EIP-712 permit)

 Individual votes are never decrypted. The voter is never identified.
```

**Anonymous path (Wave 5):** the voter generates a Semaphore membership proof,
encrypts the ballot, and submits via the relayer — steps 3–6 run identically,
but the contract verifies a ZK proof + nullifier instead of an address.

---

## 📊 ShadowDAO vs Snapshot

| | Snapshot | ShadowDAO |
|---|---|---|
| Privacy | Optional add-on | **Mandatory, by default** |
| Encryption | Threshold — all votes revealed after deadline | **FHE — individual votes never revealed** |
| Tallying | Decrypt everything, count in cleartext | **Count on ciphertext, reveal only totals** |
| Receipt-freeness | ❌ | ✅ **a vote cannot be proven or sold** |
| Voter anonymity | ❌ | ✅ **Semaphore ZK eligibility** |
| Treasury | Public on Etherscan | **Encrypted `euint32` balance** |
| Weighted voting / delegation | Off-chain / public amounts | **On-chain, encrypted (`FHE.mul` / `FHE.add`)** |
| Gasless voting | ❌ | ✅ **EIP-712 meta-tx** |
| FHE operations | 0 | **12 primitives, 5 contracts** |

---

## 🏗️ Architecture

```
contracts/
  ShadowVoteV2.sol     core voting — FHE tally, weighted, receipt-free, voteAnonymous
  ShadowSpace.sol      DAO registry + ACL + Semaphore groups
  ShadowToken.sol      confidential FHERC20 — encrypted balances -> voting power
  ShadowTreasury.sol   encrypted treasury (euint32 balance)
  ShadowDelegate.sol   encrypted delegation pool
  ShadowVote.sol       Wave 1-2 core voting
  ISemaphore.sol       minimal Semaphore v4 interface

api/                   Vercel serverless functions
  relay-vote.ts        gasless EIP-712 vote relay
  relay-anon-vote.ts   anonymous-vote relay (address never touches chain)
  pin-comment.ts       IPFS comment pinning (Pinata JWT server-side)
  fetch-ipfs.ts        IPFS read with multi-gateway fallback

src/                   React 19 dApp — 14 lazy-loaded pages
  config/contract.ts   single source of truth: addresses + ABIs
  hooks/               useAnonymousVote, useSemaphoreIdentity, useCofhe, useVote ...
sdk/                   shadowdao-sdk — reusable TypeScript clients + React hook
docs/                  COERCION-RESISTANCE.md (threat model) · WAVE5-DEPLOY.md
```

**No backend database.** All governance state lives on-chain or on IPFS; only
theme/preferences are in `localStorage`.

---

## 📈 Progress across waves

Each wave builds directly on the last — not isolated features.

| Wave | Delivered | FHE depth |
|---|---|---|
| **1 — Core FHE voting** | `ShadowVote` + `ShadowSpace`: encrypted ballots, homomorphic tally, permissionless reveal | 10 ops |
| **2 — Spaces + ACL** | Space-gated voting via cross-contract membership; encrypted analytics (`gte`, `max`, `sub`) | 13 ops |
| **3 — Treasury + weighted** | `ShadowTreasury` (encrypted balance); `ShadowVoteV2` weighted voting (`FHE.mul`), IPFS proposals | 14 ops |
| **4 — Delegation + analytics** | `ShadowDelegate` (encrypted power pool); on-chain discussion; analytics dashboard | 16 ops |
| **5 — Coercion resistance** | Receipt-free ballots, anonymous Semaphore ZK voting, anonymous relayer, `ShadowToken` confidential FHERC20; SDK, gasless, PWA | 5 FHE contracts |

---

## 🛠️ Engineering notes

Real problems solved building on a pre-1.0 FHE stack:

- **COOP/COEP vs MetaMask** — CoFHE's WASM needs `SharedArrayBuffer` (cross-origin isolation), but `require-corp` breaks MetaMask's iframe. Solved with `credentialless` + a single-threaded fallback.
- **Debugging encrypted state** — you cannot `console.log` a `euint32`. A forgotten `FHE.allowThis` fails *silently* — the tally just stays zero. Forced a discipline of reasoning about ciphertext access before every deploy.
- **Field-size mismatch** — a CoFHE `ctHash` is a full 256-bit value; a Semaphore proof message must be a SNARK field element. The anonymous-vote proof binds `scope = message = proposalId` (a small, always-valid field element) instead.
- **Gas scales with options** — each option adds 3 FHE ops to the vote loop; batched RPC reads (50/call) and TTL caching keep the dApp responsive.

---

## ▶️ Run locally

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
npm run dev
```

Node.js 18+, MetaMask on Sepolia with test ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia)).

```bash
npm run lint        # typecheck
npm run compile     # compile contracts (Hardhat + CoFHE plugin)
npm run build       # production build
npm test            # E2E contract tests on Sepolia
```

Contract tests need `.env` with `PRIVATE_KEY`, `PRIVATE_KEY_2`, `SEPOLIA_RPC_URL`.
Deploying a fresh stack: see **[docs/WAVE5-DEPLOY.md](docs/WAVE5-DEPLOY.md)**.

---

## 📚 Docs

- **[docs/COERCION-RESISTANCE.md](docs/COERCION-RESISTANCE.md)** — full threat model: actors, guarantees, honest residual risks
- **[docs/WAVE5-DEPLOY.md](docs/WAVE5-DEPLOY.md)** — deploy & verify runbook
- **[HACKATHON.md](HACKATHON.md)** — buildathon submission summary
- **[TEMPLATE.md](TEMPLATE.md)** — adapt ShadowDAO to any FHE voting contract

---

## License

MIT — built for the Fhenix Privacy-by-Design dApp Buildathon.
