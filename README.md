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

---

## The problem it solves

DAO governance has a transparency problem that nobody talks about honestly.

When votes are public, whales can pressure smaller holders — "vote my way, I can check." Traders frontrun visible vote momentum. People vote with the majority because disagreeing publicly has social costs. Last-minute pile-ons turn governance into a timing game. And vote buying? Trivially verifiable when everything is on-chain.

Snapshot added "shielded voting" recently, but it uses threshold encryption — after the vote ends, all individual votes get decrypted and become public. That's not privacy. That's delayed transparency.

ShadowDAO is different because individual votes are never decrypted. Not after the vote. Not ever. The contract performs arithmetic on encrypted data through Fhenix's CoFHE coprocessor. It knows the totals because it computed them homomorphically. But it never knew any individual ballot.

---

## Challenges I ran into

**The COOP/COEP + MetaMask fight.** CoFHE SDK needs SharedArrayBuffer for WASM workers, which requires Cross-Origin headers. But `require-corp` breaks MetaMask's iframe injection. Ended up using `credentialless` instead, which works but means the SDK falls back to single-threaded mode. It's slower (~9 seconds to encrypt) but it actually works.

**CoFHE SDK is pre-1.0 and it shows.** The `WagmiAdapter` function signature changed between patch versions. `walletClient.getAddresses()` stopped working in some configurations. Built a fallback chain: try WagmiAdapter → catch → try direct connect → catch → retry without workers. It's ugly but reliable.

**Gas scales linearly with options.** Each `vote()` call runs a loop: for every option, it does `FHE.eq` + `FHE.select` + `FHE.add`. A 2-option proposal costs ~1.2M gas. 5 options costs ~2.8M. 10 options pushes toward 5M. There's no way around it — the contract has to touch every encrypted tally.

**Debugging encrypted state is pain.** When `FHE.add` silently does nothing because you forgot `FHE.allowThis`, there's no error. The tally just stays at zero. You can't `console.log` an `euint32`. You find out 20 minutes later when reveal shows all zeros.

**ShadowSpace isn't wired to ShadowVote yet.** The DAO registry contract and the voting contract are deployed separately. Right now any wallet can vote on any proposal — space-gated voting (only members vote) is planned but not shipped.

---

## Technologies I used

Solidity 0.8.25 · Fhenix CoFHE coprocessor · @cofhe/sdk 0.4.0 · @fhenixprotocol/cofhe-contracts 0.1.0 · React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Motion 12 · wagmi 3 · viem 2 · Zustand 5 · Hardhat · Ethereum Sepolia

---

## How we built it

Started with the voting contract. The core idea is deceptively simple: for each option, keep an encrypted counter initialized to `FHE.asEuint32(0)`. When someone votes, encrypt their choice in the browser, send it on-chain, then for each option check `FHE.eq(vote, optionIndex)` — if it matches, `FHE.select` returns 1, otherwise 0. Add that to the tally with `FHE.add`. The contract never knows what matched.

Then we needed reveal. After the deadline, `FHE.allowPublic` on each tally tells the CoFHE coprocessor "this handle is now publicly readable." The frontend calls `decryptForView` with an EIP-712 permit and gets back actual numbers.

We added `getMyVote` using `FHE.allowSender` — it stores each voter's encrypted ballot and permits only the original voter to decrypt it. So you can prove to yourself what you voted without revealing it to anyone.

Then came the extra FHE operations for analysis: `FHE.gte` for encrypted quorum checks (is total votes ≥ threshold, without revealing either), `FHE.max` for private winner detection, `FHE.sub` for encrypted vote differentials.

Built ShadowSpace as a second contract — on-chain DAO registry with categories, members, join/leave. It's independent from voting right now, but the architecture is there to link them.

Frontend is 14 pages, all reading from chain. No backend, no database, no localStorage for any data. React 19, wagmi for wallet, CoFHE SDK for encryption, everything talks to Sepolia directly.

---

## What we learned

FHE makes truly private voting possible on-chain in a way that threshold encryption fundamentally can't. With threshold, you're trusting a committee to not collude. With FHE, there's no committee — the math itself prevents disclosure.

But it's not free. Gas costs scale with the number of FHE operations, and each option in a vote adds 3 operations. For real-world DAOs with many proposals and options, this needs optimization — batch processing, off-chain FHE where it makes sense, or waiting for gas costs to drop.

The CoFHE SDK is powerful but clearly early-stage. Documentation is thin, error messages are cryptic, and behavior changes between minor versions. We spent probably 30% of development time on SDK debugging and workarounds.

Debugging encrypted state is a completely different discipline. You can't print values. You can't inspect storage. You write the logic, deploy, test end-to-end, and find out if it works 20 minutes later when you try to decrypt the result. It forces you to think very carefully before you write.

---

## What's next for ShadowDAO

- **Token-gated voting** — bind proposals to ShadowSpace so only DAO members can vote
- **Encrypted delegation** — delegate your vote to another address using `FHE.allow(delegate)`, where the delegate casts your encrypted ballot without seeing it
- **On-chain treasury** — `euint64` encrypted balance, deposit/withdraw with `FHE.add`/`FHE.sub`, solvency checks with `FHE.gte`
- **Weighted voting** — `FHE.mul(vote, tokenBalance)` so voting power reflects stake
- **Quadratic voting** — `FHE.square` for sqrt-weighted ballots that resist plutocracy
- **Mainnet** — when CoFHE launches on mainnet, ShadowDAO goes with it

---

## Deployed Contracts

| Contract | Address |
|----------|---------|
| ShadowVote.sol | [`0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5`](https://sepolia.etherscan.io/address/0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5) |
| ShadowSpace.sol | [`0x136dB5145e9bD4F8DadCBA70BFa4BDE69a366EE5`](https://sepolia.etherscan.io/address/0x136dB5145e9bD4F8DadCBA70BFa4BDE69a366EE5) |

Ethereum Sepolia · Solidity 0.8.25 · EVM Cancun

---

## FHE operations used

`FHE.asEuint32` · `FHE.eq` · `FHE.select` · `FHE.add` · `FHE.gte` · `FHE.max` · `FHE.sub` · `FHE.allowThis` · `FHE.allowPublic` · `FHE.allowSender`

Frontend: `Encryptable.uint32` · `encryptInputs` · `decryptForView` · `getOrCreateSelfPermit` · `WagmiAdapter`

---

## Run locally

```bash
git clone https://github.com/plankton1212/shadowdao.git
cd shadowdao
npm install --legacy-peer-deps
npm run dev
```

Node.js 18+, MetaMask on Sepolia with test ETH.

---

## License

MIT
