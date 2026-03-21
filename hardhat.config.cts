import { HardhatUserConfig } from 'hardhat/config'
require('@nomicfoundation/hardhat-ethers')
require('@cofhe/hardhat-plugin')
require('dotenv').config()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.25',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    'eth-sepolia': {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
}

export default config
