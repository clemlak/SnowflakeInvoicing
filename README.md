# Snowflake Invoicing

## Introduction
https://github.com/HydroBlockchain/hcdp/issues/254

The resolver is located at `contracts/resolvers/Invoicing.sol`.

## Testing With Truffle
- This folder has a suite of tests created through [Truffle](https://github.com/trufflesuite/truffle).
- To run these tests:
  - Clone this repo: `git clone https://github.com/hydrogen-dev/smart-contracts.git`
  - Navigate to `smart-contracts/snowflake`
  - Run `npm install`
  - Build dependencies with `npm run build`
  - Spin up a development blockchain: `npm run chain`
  - In another terminal tab, run the test suite: `npm test`
  - To test the Invoicing resolver, run `npm run test-invoicing`

## Copyright & License
Copyright 2018 The Hydrogen Technology Corporation under the GNU General Public License v3.0.
