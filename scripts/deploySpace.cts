import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying ShadowSpace with account:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Account balance:', ethers.formatEther(balance), 'ETH')

  // Wave 5: ShadowSpace needs the Semaphore protocol address (anonymous voting).
  // Semaphore is deployed deterministically at the same address on all chains.
  const SEMAPHORE_ADDRESS = process.env.SEMAPHORE_ADDRESS ?? '0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D'
  console.log('Using Semaphore at:', SEMAPHORE_ADDRESS)

  const ShadowSpace = await ethers.getContractFactory('ShadowSpace')
  console.log('Deploying ShadowSpace...')

  const shadowSpace = await ShadowSpace.deploy(SEMAPHORE_ADDRESS)
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
