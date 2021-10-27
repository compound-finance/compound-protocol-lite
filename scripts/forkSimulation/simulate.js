// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

const compoundContracts = JSON.parse(fs.readFileSync("./networks/mainnet.json"))
  .Contracts;
const compoundContractAbis = JSON.parse(
  fs.readFileSync("./networks/mainnet-abi.json")
);
const contracts = {};

async function main() {
  // Setup fork with signers
  const [arr00Signer, otherSigner] = await initializeForkWithSigners(
    [
      "0x2B384212EDc04Ae8bB41738D05BA20E33277bf33",
      "0xd5447a7aa223268398cf7c38c2c580622cc98772",
    ],
    13502148
  );

  // Example usage of CompoundLens
  // const tx = await contracts["CompoundLens"].callStatic.cTokenMetadata(
  //   contracts["cETH"].address
  // );
  // console.log(tx);

  // Send ETH example
  // arr00Signer.sendTransaction({
  //   to: "0x50D5587403F096dc1ad81164670046182a635221",
  //   value: ethers.utils.parseEther("0.001"),
  // });

  // Example Contract creation from live on chain contract
  // let cREP = new ethers.Contract("0x158079ee67fce2f58472a96584a73c7ab9ac95c1",cREPAbi,arr00Signer);

  // Create and deploy a new contract
  // const Greeter = await ethers.getContractFactory("Greeter", arr00Signer);
  // const greeter = await Greeter.deploy("Hello, Hardhat!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function generateContracts(signer) {
  for (const [key, value] of Object.entries(compoundContracts)) {
    if (key in compoundContractAbis) {
      // have abi for contract
      contracts[key] = new ethers.Contract(
        value,
        compoundContractAbis[key],
        signer
      );
    }
  }
}

async function initializeForkWithSigners(signers, block = null) {
  // Setup fork
  let inputData = [
    {
      forking: {
        jsonRpcUrl: "https://mainnet-eth.compound.finance",
      },
    },
  ];
  if (block) {
    inputData[0].forking["blockNumber"] = block;
  }
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://mainnet-eth.compound.finance",
          inputData,
        },
      },
    ],
  });

  // unlock accounts
  const signersToReturn = [];
  for (const account of signers) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [account],
    });
    signersToReturn.push(await ethers.getSigner(account));
  }
  generateContracts(signersToReturn[0]);
  return signersToReturn;
}
