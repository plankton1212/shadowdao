# ShadowDAO — Adapt to Your Contract in 30 Minutes

This guide shows how to replace ShadowDAO's default contracts with your own FHE voting contract while keeping the full UI, hooks, and SDK.

---

## Architecture

The entire contract layer is isolated in **one file**:

```
src/config/contract.ts
```

All hooks, pages, and UI components consume contract data through **typed hooks** in `src/hooks/`. No hardcoded addresses anywhere else.

---

## Step 1 — Deploy your FHE contract (5 min)

Your contract must implement the same interface as `ShadowVote.sol`. The minimum ABI surface:

```solidity
// Minimum interface for ShadowDAO UI compatibility
interface IYourVoteContract {
    function createProposal(string calldata title, uint8 optionCount, uint256 deadline, uint256 quorum, uint256 spaceId, bool spaceGated) external returns (uint256);
    function vote(uint256 proposalId, InEuint32 calldata encryptedOption) external;
    function revealResults(uint256 proposalId) external;
    function getProposal(uint256 proposalId) external view returns (address creator, string memory title, uint8 optionCount, uint256 deadline, uint256 quorum, uint256 voterCount, bool revealed, uint256 spaceId, bool spaceGated);
    function hasUserVoted(uint256 proposalId, address user) external view returns (bool);
    function getProposalCount() external view returns (uint256);
    function getUserProposals(address user) external view returns (uint256[] memory);
    function getUserVotes(address user) external view returns (uint256[] memory);
}
```

Deploy with Hardhat:
```bash
npx hardhat run scripts/deploy.cts --network eth-sepolia --config hardhat.config.cts
```

---

## Step 2 — Swap addresses (1 min)

Open `src/config/contract.ts` and replace the two constants at the top:

```typescript
// Before
export const SHADOWVOTE_ADDRESS = '0x625b9b6cBd467E69b4981457e7235EBd2874EF86';
export const SHADOWSPACE_ADDRESS = '0x2B2A4370c5f26cB109D04047e018E65ddf413c88';

// After — your own deployments
export const SHADOWVOTE_ADDRESS = '0xYourVoteContract' as const;
export const SHADOWSPACE_ADDRESS = '0xYourSpaceContract' as const;
```

That's the **only file** you need to change for a full swap.

---

## Step 3 — Update ABIs (10 min)

If your contract has the same function signatures, the existing ABIs work. If you added/changed functions, update `SHADOWVOTE_ABI` in the same file.

Each ABI entry is a typed object — TypeScript will catch mismatches at build time (`npm run lint`).

---

## Step 4 — Wire contracts (2 min)

If your contracts have cross-contract references (like ShadowVote ↔ ShadowSpace):

```bash
# Edit wireAll.ts with your addresses
PRIVATE_KEY=0x... \
SHADOWVOTEV2_ADDRESS=0xYour... \
SHADOWSPACE_ADDRESS=0xYour... \
SHADOWTREASURY_ADDRESS=0xYour... \
SHADOWDELEGATE_ADDRESS=0xYour... \
npx tsx scripts/wireAll.ts
```

---

## Step 5 — Verify (5 min)

```bash
# Type check — catches ABI mismatches
npm run lint

# Run tests against your new deployment
SHADOWVOTE_ADDRESS=0xYour... npx tsx test/e2e-contract.ts

# Start dev server
npm run dev
```

Open `localhost:3000` — all 14 pages will work against your contract.

---

## What you DON'T need to change

| File | Why |
|------|-----|
| All pages in `src/pages/` | Read data through hooks, not direct contract calls |
| All components in `src/components/UI.tsx` | Zero business logic, pure UI |
| All hooks in `src/hooks/` | Abstract the contract interface, configurable |
| `src/App.tsx` | Routing only |
| `src/index.css` | Design tokens only |

---

## Using the SDK instead

If you want to build your own frontend using just the contract clients:

```typescript
import { ShadowVoteClient } from './sdk/src';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

const voteClient = new ShadowVoteClient({
  address: '0xYourContractAddress',
  abi: YOUR_ABI,           // paste your ABI here
  publicClient,
  walletClient,            // for write operations
});

// Read all proposals
const proposals = await voteClient.getAllProposals();

// Vote with FHE-encrypted option
const encryptedOption = await encryptInputs(/* CoFHE SDK */);
const txHash = await voteClient.vote(proposalId, encryptedOption);
```

Or use the React hook for automatic state management:

```typescript
import { useShadowVote } from './sdk/src';

const { proposals, loading, vote, createProposal } = useShadowVote(
  '0xYourContract',
  YOUR_ABI,
  publicClient,
  walletClient,
);
```

---

## Customizing categories

Edit `src/config/contract.ts`:

```typescript
export const CATEGORY_LABELS = ['DeFi', 'NFT', 'Infrastructure', ...] as const;
// Replace with your own category taxonomy
```

---

## Customizing the design

All visual tokens are CSS variables in `src/index.css`:

```css
@theme {
  --color-primary-accent: #1A8C52;  /* Change to your brand color */
  --color-surface-accent: #D4F542;  /* Call-to-action background */
  --radius-card: 24px;              /* Card border radius */
}
```

One file controls the entire design system.

---

## Adding a new page

1. Create `src/pages/YourPage.tsx` — use `AppLayout` and `PageWrapper` as wrappers
2. Add a route in `src/App.tsx`
3. Add a navigation item in `AppTopBar.tabs` in `src/components/UI.tsx`

---

## Checklist

- [ ] Deploy your FHE contract
- [ ] Update `SHADOWVOTE_ADDRESS` in `contract.ts`
- [ ] Update `SHADOWVOTE_ABI` in `contract.ts`
- [ ] Wire contracts if needed (`wireAll.ts`)
- [ ] Run `npm run lint` — no TypeScript errors
- [ ] Run `npm run test` — E2E green on your deployment
- [ ] Run `npm run build` — production build succeeds
- [ ] Deploy to Vercel — set `COOP/COEP` headers (see `vercel.json`)

**Total time: ~30 minutes for a fully working DAO frontend.**
