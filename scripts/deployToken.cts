import { ethers } from 'hardhat'

/**
 * Deploy ShadowToken — the Wave 5 confidential governance token.
 *
 *   npm run deploy:token
 *
 * After deploying:
 *   1. Put the address in SHADOWTOKEN_ADDRESS (src/config/contract.ts and .env)
 *   2. Run `npm run wire:all` so ShadowVoteV2.setShadowToken() is called
 *   3. Mint to holders, who then call syncVotingPower(shadowVoteV2)
 */
async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying ShadowToken with account:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Account balance:', ethers.formatEther(balance), 'ETH')

  const ShadowToken = await ethers.getContractFactory('ShadowToken')
  console.log('Deploying ShadowToken...')

  const shadowToken = await ShadowToken.deploy()
  await shadowToken.waitForDeployment()

  const address = await shadowToken.getAddress()
  console.log('ShadowToken deployed to:', address)
  console.log('\nNext steps:')
  console.log('  1. Set SHADOWTOKEN_ADDRESS in src/config/contract.ts to:', address)
  console.log('  2. Add SHADOWTOKEN_ADDRESS=' + address + ' to .env')
  console.log('  3. Run `npm run wire:all` to call ShadowVoteV2.setShadowToken()')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
