require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("./plugin/dist/index");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet-eth.compound.finance",
        blockNumber: 12466889,
      },
    },

    mainnet: {
      url: "https://mainnet-eth.compound.finance",
      accounts: [],
    },
  },

  solidity: {
    version: "0.5.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
