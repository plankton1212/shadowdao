import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying ShadowVote with account:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Account balance:', ethers.formatEther(balance), 'ETH')

  const ShadowVote = await ethers.getContractFactory('ShadowVote')
  console.log('Deploying ShadowVote...')

  const shadowVote = await ShadowVote.deploy()
  await shadowVote.waitForDeployment()

  const address = await shadowVote.getAddress()
  console.log('ShadowVote deployed to:', address)
  console.log('\nUpdate SHADOWVOTE_ADDRESS in src/config/contract.ts with:', address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
