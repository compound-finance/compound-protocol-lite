# Compound Protocol Lite

Experimental [Hardhat](https://hardhat.org/) repo.

## Scripts

Simulate (see the `forking` config in `hardhat.config.js`):

```
$ npx hardhat run scripts/post-prices.js
```

Do for real (must have an `account` with ETH in it):

```
$ npx hardhat run scripts/post-prices.js --network mainnet
```


run simulation
```
$ npx hardhat node --fork 'https://mainnet-eth.compound.finance' --fork-block-number 12654800
$ npx hardhat test test/2.9-test.js --network localhost
```
