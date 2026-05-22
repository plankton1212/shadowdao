# ShadowDAO — Coercion Resistance & Threat Model

> Wave 5 of the Fhenix Privacy-by-Design Buildathon turns ShadowDAO from a
> *confidential* voting app into a *coercion-resistant* one. This document is
> the honest threat model: what an attacker can and cannot do, what the
> contracts enforce, and what is still open.

---

## 1. Confidential ≠ coercion-resistant

Encrypting the *ballot* is not enough. A voting system is only coercion-resistant
if an attacker cannot **observe**, **buy**, or **compel** a vote. That requires
three separate properties:

| Property | Question it answers | Status |
|---|---|---|
| **Ballot secrecy** | Can anyone read *what* you voted? | ✅ Live since Wave 1 (FHE-encrypted tally) |
| **Receipt-freeness** | Can *you* prove to a briber what you voted? | ✅ **Wave 5 (this document)** |
| **Voter anonymity** | Can anyone see *that you* voted at all? | ✅ Wave 5 — anonymous eligibility (Semaphore ZK) + relayer transport |

ShadowDAO had the first. Before Wave 5 it did **not** have the second, and a
system without receipt-freeness is not coercion-resistant — a briber simply
demands proof.

---

## 2. Threat actors

| Actor | Goal | Lever |
|---|---|---|
| **Briber** | Buy votes | Pay only on *proof* of how the seller voted |
| **Coercer** | Force a vote (employer, whale, state) | Punish unless shown a "correct" vote |
| **Whale** | Suppress dissent | Watch who votes against them, retaliate |
| **Front-runner / MEV** | Trade on the outcome | Read vote momentum before reveal |

All four are defeated by the *same* property set: an attacker must not be able
to **link a vote choice to an identity** — not by reading the chain, and not by
being handed a receipt.

---

## 3. Guarantee matrix — before vs. after Wave 5

| What an attacker tries | Before Wave 5 | After Wave 5 (receipt-freeness) |
|---|---|---|
| Read a ballot from chain state | ❌ Blocked (FHE-encrypted) | ❌ Blocked |
| Read the running tally before reveal | ❌ Blocked (FHE-encrypted) | ❌ Blocked |
| **Make the voter decrypt their own ballot as proof** | ⚠️ **Possible** — `getMyVote()` + the voter's EIP-712 permit returned the plaintext choice | ❌ **Blocked** — function removed, no permit granted, no copy stored |
| See *that* an address voted | ⚠️ Possible (`hasVoted` is public) | ⚠️ Still possible — closed by anonymous eligibility (roadmap) |
| See the voter's voting power | ⚠️ Possible (admin-set, voter-decryptable) | ⚠️ Still possible — closed by the confidential token (roadmap) |

The single change that flips the headline row: **the ballot is now receipt-free**.

---

## 4. What the contract enforces (Wave 5)

Receipt-freeness is enforced in `contracts/ShadowVoteV2.sol`, in `_castVote`:

- **No per-voter ballot copy.** The `userEncryptedVotes` mapping was deleted.
  The ballot ciphertext is consumed into the tally (`FHE.eq` → `FHE.select` →
  `FHE.add`) and then discarded.
- **No decryption permit on the ballot.** `FHE.allowSender()` is no longer
  called on the individual ballot. Without a permit, the CoFHE coprocessor
  will not decrypt that handle for the voter — there is nothing to "show."
- **No `getMyVote()`.** The function that returned a voter's own ballot handle
  is removed from the contract and from the ABI (`src/config/contract.ts`).

What is *deliberately kept* public and verifiable:

- **Participation.** `hasUserVoted(proposalId, voter)` still returns a boolean.
  A voter can confirm their vote was *recorded* — they just cannot prove its
  *content*. (UI: the receipt-free confirmation card in `ProposalDetail.tsx`.)
- **Aggregate analytics.** `FHE.allowSender` is still used for *aggregate*
  results — encrypted quorum check, max tally, margin — never for an individual
  ballot. Aggregates reveal nothing about any single voter.

A briber now has nothing to pay against: the seller cannot produce a proof, so
the vote-buying market does not clear.

---

## 5. Honest residual risks

Receipt-freeness closes the on-chain receipt. It does **not** close everything,
and ShadowDAO does not claim it does:

- **Encryption-time observation.** A coercer physically watching the voter's
  screen while the CoFHE SDK encrypts the choice sees the plaintext. This is
  outside any on-chain system's reach; it is mitigated by client-side UX
  (no plaintext echo) and, ultimately, by the voter's own opsec.
- **Voter identity is still public.** `hasVoted` exposes *that* an address
  participated. A coercer can still punish *non*-participation. This is the
  next gap — see §6.
- **Voting power is admin-assigned.** Weighted voting currently trusts an admin
  to set `setVotingPower`. Not a receipt issue, but a centralization one — see §6.

Stating these openly is deliberate: a threat model that claims total victory is
not a threat model.

---

## 6. Roadmap — closing the remaining gaps

Wave 5 continues along one coherent line: make the *whole* governance lifecycle
coercion-resistant, not just the ballot.

- **Anonymous eligibility (ZK).** Replace `isSpaceMember(msg.sender)` and the
  address-keyed `hasVoted` with a Semaphore-style zero-knowledge membership
  proof plus a per-proposal nullifier. The contract verifies *eligibility*
  without learning *identity*; the nullifier still prevents double-voting.
  Routed through the existing gasless relayer, the voter's wallet address never
  touches the chain. This closes the "see *that* you voted" row.
- **Confidential voting-power token.** Replace admin-set `setVotingPower` with
  an encrypted balance snapshot from an FHERC20 token, so weight is trustless
  and Sybil-resistant rather than centrally assigned.

Together with receipt-freeness, these make every stage — token holding,
eligibility, the ballot, the tally — confidential and uncoercible.

---

*Last updated: Wave 5. Receipt-freeness, anonymous eligibility (Semaphore ZK),
anonymous relayer transport, and the confidential governance token (ShadowToken)
are all implemented in code and compile/typecheck cleanly. They go live on the
next contract redeploy to Sepolia — see the Wave 5 deploy sequence in the repo.*
