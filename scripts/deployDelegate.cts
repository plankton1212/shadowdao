import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying ShadowDelegate with:', deployer.address);

  const factory = await hre.ethers.getContractFactory('ShadowDelegate');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('ShadowDelegate deployed to:', address);
  console.log('Update SHADOWDELEGATE_ADDRESS in src/config/contract.ts');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
