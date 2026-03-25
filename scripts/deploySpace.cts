import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying ShadowSpace with account:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Account balance:', ethers.formatEther(balance), 'ETH')

  const ShadowSpace = await ethers.getContractFactory('ShadowSpace')
  console.log('Deploying ShadowSpace...')

  const shadowSpace = await ShadowSpace.deploy()
  await shadowSpace.waitForDeployment()

  const address = await shadowSpace.getAddress()
  console.log('ShadowSpace deployed to:', address)
  console.log('\nUpdate SHADOWSPACE_ADDRESS in src/config/contract.ts with:', address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
