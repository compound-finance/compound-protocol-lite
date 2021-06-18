const { expect, assert } = require("chai");
const hre = require('hardhat');
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");

const cUSDCaddress = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";
const cDaiAddress = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const newDelegate = "0xa035b9e130F2B1AedC733eEFb1C67Ba4c503491F";

const timelockAddress = "0x6d903f6003cca6255D85CcA4D3B5E5146dC33925";
const liquidatorAddress = "0x7d6149ad9a573a6e2ca6ebf7d4897c1b766841b4";// liquidate usdc borrow
const borrowerAddress = "0x52185a2bbcfd67c1d07963e3575175ee9f95a551";// supply DAI borrow usdc
const compHolderAddress = "0x7587cAefc8096f5F40ACB83A09Df031a018C66ec";
const comptrollerImpl = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";

const util = require('util')

function etherMantissa(num, scale = 18n) {
  assert(num > 0, 'not suppoert');
  let res = BigInt(num) * 10n ** BigInt(scale);
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
    if (ev.event == 'Failure') {
      const e = new Error(`Failed w ${ev.args}`);
      console.error("TRACE", e.stack || e);
      console.log("FAILURE ERROR: ", util.inspect(ev, false, null, true));
      throw e;
    }
  }
  return tx;
}

async function mine(num, provider) {
  for (let i = 0; i < num; i++){
    await provider.send('evm_mine', []);
  }
}

// XXX
describe("Compound 2.9 upgrade", function() {
  it.only("Should ugprade delegate and test redeem", async function() {
    // setup
    this.timeout(300000);
    const accounts = await ethers.getSigners();
    const [timelock, liquidator, borrower, compHolder] = await unlock([timelockAddress, liquidatorAddress, borrowerAddress, compHolderAddress]);

    const cUSDC = await hre.ethers.getContractAt("CErc20Delegator", cUSDCaddress);
    const cDAI = await hre.ethers.getContractAt("CErc20Delegator", cDaiAddress);
    
    await accounts[0].sendTransaction({to: timelockAddress, value: etherMantissa(1)});// fund w eth
    await accounts[0].sendTransaction({to: liquidatorAddress, value: etherMantissa(1)});// fund w eth
    
    // set impl
    await assertNoFailure(cDAI.connect(timelock)._setImplementation(newDelegate, false, "0x"));
    expect(await cDAI.implementation()).to.equal(newDelegate);
    
    await assertNoFailure(cUSDC.connect(liquidator).redeemUnderlying(etherMantissa(10, 6)));// fund w dai

    // set up liquidation
    await assertNoFailure(cUSDC.connect(borrower).borrow(etherMantissa(3101000, 6)));// get unhealthy
    await mine(1000, ethers.provider);
    await assertNoFailure(cUSDC.connect(liquidator).accrueInterest());
    
    const tx = await assertNoFailure(cUSDC.connect(liquidator).liquidateBorrow(borrowerAddress, etherMantissa(10n, 6), cDaiAddress));
    console.log(tx.events);
  });
});
