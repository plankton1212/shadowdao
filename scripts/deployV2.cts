import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying ShadowVoteV2 with:', deployer.address);

  const factory = await hre.ethers.getContractFactory('ShadowVoteV2');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('ShadowVoteV2 deployed to:', address);
  console.log('Update SHADOWVOTEV2_ADDRESS in src/config/contract.ts');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
