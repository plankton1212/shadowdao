# Wave 5 — Deploy & Verify Runbook

Wave 5 adds receipt-free ballots, anonymous Semaphore-ZK voting, an anonymous
relayer, and a confidential governance token. Contracts changed, so a redeploy
to Sepolia is required. This is the exact sequence.

> **Current Sepolia deployment (Wave 5 — live & wired):**
> ShadowSpace `0x96F2AEa4c7Cf81D47AF0A6fBDC1eAe7E3f4E299E` ·
> ShadowVoteV2 `0xA45AD263C91c365b3F8170ebba8FCda7944fBaDa` ·
> ShadowToken `0x9a86031C1392033007eA928Fd6166B0C6eD5b238`.
> ShadowTreasury (`0xc7E0…b0db`) and ShadowDelegate (`0x2a89…b5f1`) kept their
> existing addresses (code unchanged) and were re-wired to the new ShadowVoteV2.
> All six contracts are wired (`setSemaphore`, `setShadowToken`, cross-refs).
> The steps below are the procedure for a *future* redeploy.

## 0. Prerequisites

`.env` (repo root) must contain:

```
PRIVATE_KEY=0x...            # funded Sepolia deployer
SEPOLIA_RPC_URL=https://...  # an RPC that allows wide getLogs ranges helps
```

Semaphore is already live on Sepolia at
`0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` — nothing to deploy for it.

## 1. Compile

```
npm run compile
```

## 2. Deploy contracts

```
npm run deploy:space      # ShadowSpace  (constructor now takes the Semaphore address)
npm run deploy:v2         # ShadowVoteV2 (receipt-free + voteAnonymous + token hook)
npm run deploy:treasury   # ShadowTreasury
npm run deploy:delegate   # ShadowDelegate
npm run deploy:token      # ShadowToken  (NEW — confidential governance token)
```

Copy each printed address.

## 3. Update addresses

In `src/config/contract.ts` set: `SHADOWSPACE_ADDRESS`, `SHADOWVOTEV2_ADDRESS`,
`SHADOWTREASURY_ADDRESS`, `SHADOWDELEGATE_ADDRESS`, `SHADOWTOKEN_ADDRESS`.

In `.env` add the same five plus `SHADOWVOTE_ADDRESS` (V1, unchanged):

```
SHADOWVOTE_ADDRESS=0x...        SHADOWSPACE_ADDRESS=0x...
SHADOWVOTEV2_ADDRESS=0x...      SHADOWTREASURY_ADDRESS=0x...
SHADOWDELEGATE_ADDRESS=0x...    SHADOWTOKEN_ADDRESS=0x...
```

## 4. Wire contracts

```
npm run wire:all
```

This calls `setShadowSpaceContract`, `setShadowVoteContract` (×3), and the Wave 5
wiring `setSemaphore` + `setShadowToken` on ShadowVoteV2.

## 5. Update the relayer (Vercel env vars)

For `/api/relay-anon-vote` and `/api/relay-vote`:

```
RELAYER_PRIVATE_KEY=0x...     # a SEPARATE funded Sepolia account
SEPOLIA_RPC_URL=https://...
ALLOWED_ORIGIN=https://<your-vercel-domain>
SHADOWVOTEV2_ADDRESS=0x...    # the new V2 address
```

## 6. Post-deploy smoke test

1. **Standard flow still works:** create a normal proposal → vote → after the
   deadline `revealResults`. (Confirms the receipt-free WS1 change didn't break
   the base path.)
2. **Anonymous flow:** create a *space*, create a proposal with the **Anonymous
   Voting** toggle on → on the proposal page, **Register Anonymous Voting
   Identity** → **Vote Anonymously (ZK)**.
3. **Token:** owner mints SHADOW to a holder; holder calls `syncVotingPower` →
   create a weighted proposal → confirm weighted tally.

## Known risks to watch during testing

These compile and typecheck, but were not verified on a live network:

1. **Semaphore proof generation in-browser** — `@semaphore-protocol/proof`
   fetches circuit artifacts from a CDN. Confirm it loads alongside the CoFHE
   WASM (COOP/COEP headers in `vercel.json`).
2. **Group reconstruction** — `src/hooks/useAnonymousVote.ts` (`buildGroup`)
   reads Semaphore `MemberAdded` logs with `fromBlock: 0n`. Some RPCs cap the
   `getLogs` range. If it fails, set `fromBlock` to the ShadowSpace deploy block.
3. **Cross-contract FHE ACL** — `ShadowToken.syncVotingPower` grants ShadowVoteV2
   access to the balance ciphertext (`FHE.allow`), then `receiveVotingPower`
   stores it. Verify a weighted vote works after a sync.
4. **Anonymous = no UI "you voted" on reload** — by design (the chain cannot
   know who voted). A double-vote attempt reverts cleanly via the nullifier.

## Still open (post-deploy polish)

- README.md / HACKATHON.md — update once addresses are live (avoid pre-deploy
  "live" claims).
- A dedicated ShadowToken UI page (mint / transfer / sync) — currently the token
  is usable via the SDK, scripts, and Etherscan; no in-app page yet.
