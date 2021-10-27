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

## Running Forking Simulation Scripts

Modify the `main` function in `scripts/simulate.js` to simulate as needed. Make sure to set the block parameter in the `initializeForkWithSigners` function if necessary.
