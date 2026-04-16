import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
dotenv.config();

const KEY = process.env.PRIVATE_KEY as `0x${string}`;
const RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const VOTE  = '0x625b9b6cBd467E69b4981457e7235EBd2874EF86' as const;
const SPACE = '0x2B2A4370c5f26cB109D04047e018E65ddf413c88' as const;

const acc = privateKeyToAccount(KEY);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const w   = createWalletClient({ account: acc, chain: sepolia, transport: http(RPC) });

const VOTE_ABI  = parseAbi(['function setShadowSpaceContract(address _shadowSpace)']);
const SPACE_ABI = parseAbi(['function setShadowVoteContract(address _shadowVote)']);

async function main() {
  console.log('Wiring ShadowVote <-> ShadowSpace...');
  console.log('  Vote:  ', VOTE);
  console.log('  Space: ', SPACE);

  const h1 = await w.writeContract({ address: VOTE, abi: VOTE_ABI, functionName: 'setShadowSpaceContract', args: [SPACE] });
  console.log('setShadowSpaceContract tx:', h1);
  await pub.waitForTransactionReceipt({ hash: h1 });
  console.log('✓ ShadowVote.shadowSpaceContract =', SPACE);

  const h2 = await w.writeContract({ address: SPACE, abi: SPACE_ABI, functionName: 'setShadowVoteContract', args: [VOTE] });
  console.log('setShadowVoteContract tx:', h2);
  await pub.waitForTransactionReceipt({ hash: h2 });
  console.log('✓ ShadowSpace.shadowVoteContract =', VOTE);

  console.log('\nDone. Both contracts are wired.');
}

main().catch(e => { console.error(e); process.exit(1); });
