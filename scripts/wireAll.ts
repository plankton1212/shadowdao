/**
 * Wire all Wave 3/4/5 contracts together after deployment.
 *
 * Run after deploying all four contracts:
 *   npx tsx scripts/wireAll.ts
 *
 * Expects in .env:
 *   PRIVATE_KEY=0x...
 *   SHADOWVOTE_ADDRESS=0x...       (V1, already deployed)
 *   SHADOWSPACE_ADDRESS=0x...      (already deployed)
 *   SHADOWVOTEV2_ADDRESS=0x...     (just deployed)
 *   SHADOWTREASURY_ADDRESS=0x...   (just deployed)
 *   SHADOWDELEGATE_ADDRESS=0x...   (just deployed)
 */

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import 'dotenv/config';

const account = privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`);

const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });
const publicClient = createPublicClient({ chain: sepolia, transport: http() });

const V2_ADDRESS = process.env.SHADOWVOTEV2_ADDRESS! as `0x${string}`;
const SPACE_ADDRESS = process.env.SHADOWSPACE_ADDRESS! as `0x${string}`;
const TREASURY_ADDRESS = process.env.SHADOWTREASURY_ADDRESS! as `0x${string}`;
const DELEGATE_ADDRESS = process.env.SHADOWDELEGATE_ADDRESS! as `0x${string}`;
const TOKEN_ADDRESS = process.env.SHADOWTOKEN_ADDRESS as `0x${string}` | undefined;
const SEMAPHORE_ADDRESS = (process.env.SEMAPHORE_ADDRESS
  ?? '0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D') as `0x${string}`;

const V2_ABI = parseAbi([
  'function setShadowSpaceContract(address) external',
  'function setSemaphore(address) external',
  'function setShadowToken(address) external',
]);
const SPACE_ABI = parseAbi(['function setShadowVoteContract(address) external']);
const TREASURY_ABI = parseAbi(['function setShadowVoteContract(address) external']);
const DELEGATE_ABI = parseAbi(['function setShadowVoteContract(address) external']);

async function wire(label: string, address: `0x${string}`, abi: readonly any[], fnName: string, arg: `0x${string}`) {
  console.log(`\n→ ${label}: ${fnName}(${arg})`);
  const hash = await walletClient.writeContract({ address, abi, functionName: fnName, args: [arg] });
  console.log('  tx:', hash);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('  ✓ confirmed');
}

async function main() {
  console.log('Wiring all Wave 3/4/5 contracts...');
  console.log('Deployer:', account.address);

  // ShadowVoteV2 ↔ ShadowSpace
  await wire('ShadowVoteV2', V2_ADDRESS, V2_ABI, 'setShadowSpaceContract', SPACE_ADDRESS);
  await wire('ShadowSpace', SPACE_ADDRESS, SPACE_ABI, 'setShadowVoteContract', V2_ADDRESS);

  // ShadowTreasury → ShadowVoteV2
  await wire('ShadowTreasury', TREASURY_ADDRESS, TREASURY_ABI, 'setShadowVoteContract', V2_ADDRESS);

  // ShadowDelegate → ShadowVoteV2
  await wire('ShadowDelegate', DELEGATE_ADDRESS, DELEGATE_ABI, 'setShadowVoteContract', V2_ADDRESS);

  // Wave 5: ShadowVoteV2 → Semaphore (anonymous voting)
  await wire('ShadowVoteV2', V2_ADDRESS, V2_ABI, 'setSemaphore', SEMAPHORE_ADDRESS);

  // Wave 5: ShadowVoteV2 → ShadowToken (trustless weighted-voting power)
  if (TOKEN_ADDRESS) {
    await wire('ShadowVoteV2', V2_ADDRESS, V2_ABI, 'setShadowToken', TOKEN_ADDRESS);
  } else {
    console.log('\n⚠ SHADOWTOKEN_ADDRESS not set — skipping setShadowToken.');
    console.log('  Deploy ShadowToken (npm run deploy:token), set the env var, then re-run.');
  }

  console.log('\n✅ All contracts wired successfully.');
  console.log('\nUpdate src/config/contract.ts with these addresses:');
  console.log('  SHADOWVOTEV2_ADDRESS  =', V2_ADDRESS);
  console.log('  SHADOWTREASURY_ADDRESS=', TREASURY_ADDRESS);
  console.log('  SHADOWDELEGATE_ADDRESS=', DELEGATE_ADDRESS);
}

main().catch((err) => { console.error(err); process.exit(1); });
