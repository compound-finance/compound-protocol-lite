const hre = require('hardhat');
const fetch = require('node-fetch');

const ReadSymbols = [
  'BAT',
  'BTC',
  'COMP',
  'DAI',
  'ETH',
  'KNC',
  'LINK',
  'REP',
  'SAI',
  'TUSD',
  'UNI',
  'USDC',
  'USDT',
  'ZRX',
];

const PostSymbols = [
  'BAT',
  'BTC',
  'COMP',
  'DAI',
  'ETH',
  'KNC',
  'LINK',
  'REP',
  'UNI',
  'ZRX',
];

async function main() {
  const reported = await (await fetch('https://prices.compound.finance/coinbase')).json();
  const oracle = await hre.ethers.getContractAt("IUniswapAnchoredView", "0x4007B71e01424b2314c020fB0344b03A7C499E1A");
  const posted = await (await oracle.postPrices(reported.messages, reported.signatures, PostSymbols, {gasLimit: 1000000})).wait();
  console.log(`Posted: ${posted.events.length} events, Gas used: ${posted.gasUsed}`)
  const prices = {}
  for (const symbol of ReadSymbols)
    prices[symbol] = BigInt((await oracle.callStatic.price(symbol)).toString());
  console.log("Prices:", prices);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
