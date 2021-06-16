const { expect, assert } = require("chai");
const hre = require('hardhat');
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");

const cUniAddress = "0x35A18000230DA775CAc24873d00Ff85BccdeD550";
const cDaiAddress = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const newDelegate = "0x3587b2F7E0E2D6166d6C14230e7Fe160252B0ba4";

const timelockAddress = "0x6d903f6003cca6255D85CcA4D3B5E5146dC33925";
const liquidatorAddress = "0x7d6149ad9a573a6e2ca6ebf7d4897c1b766841b4";
const uniHolderAddress = "0x767ecb395def19ab8d1b2fcc89b3ddfbed28fd6b";
const compHolderAddress = "0x7587cAefc8096f5F40ACB83A09Df031a018C66ec";

const cUSDCaddress = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";

function etherMantissa(num, scale = 1e18) {
  let res;
  if (num < 0) {
    res = new BigNumber(2).pow(256).plus(num);
  } else {
    res = new BigNumber(num).times(scale);
  }
  return ethers.BigNumber.from(res.toString());
}

async function unlock(accts) {
  let signers = [];
  for (let acc of accts) {
    await hre.network.provider.request({method: "hardhat_impersonateAccount", params: [acc]});
    signers.push(await ethers.provider.getSigner(acc));
  }
  return signers;
}

async function assertNoFailure(txPromise) {
  const txRaw = await txPromise;
  const tx = await txRaw.wait();
  for (let ev of tx.events) {
    console.log("ev", ev.blockNumber);
    assert(ev.event != 'Failure', `Failed w ${ev.args}, ${ev}`);
  }
  return tx;
}

// XXX
describe("Compound 2.9 upgrade", function() {
  it("Should ugprade delegate and test redeem", async function() {
    // setup
    this.timeout(300000);
    const accounts = await ethers.getSigners();
    const [timelock, liquidator, uniHolder, compHolder] = await unlock([timelockAddress, liquidatorAddress, uniHolderAddress, compHolderAddress]);

    const cDAI = await hre.ethers.getContractAt("CErc20Delegator", cDaiAddress);
    const cUSDC = await hre.ethers.getContractAt("CErc20Delegator", cUSDCaddress);
    
    await accounts[0].sendTransaction({to: timelockAddress, value: etherMantissa(1)});// fund w eth
    await accounts[0].sendTransaction({to: liquidatorAddress, value: etherMantissa(1)});// fund w eth
    
    // set impl
    await assertNoFailure(cDAI.connect(timelock)._setImplementation(newDelegate, false, "0x"));
    expect(await cDAI.implementation()).to.equal(newDelegate);
    
    // await assertNoFailure(cDAI.connect(liquidator).redeemUnderlying(etherMantissa(1)));// fund w dai
    // set up liquidation
    await assertNoFailure(cUSDC.connect(uniHolder).borrow(etherMantissa(8, 1e13)));// get unhealthy
    await assertNoFailure(cDAI.connect(liquidator).liquidateBorrow(uniHolderAddress, etherMantissa(.45), cUniAddress));
  });
});
