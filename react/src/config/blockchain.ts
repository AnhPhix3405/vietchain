export const BLOCKCHAIN_CONFIG = {
  chainId: "vietchain", // Default Ignite chain ID
  chainName: "VietChain",
  rpcEndpoint: "http://localhost:26657",
  restEndpoint: "http://localhost:1317",
  addressPrefix: "cosmos", // Default Ignite prefix
  currency: {
    coinDenom: "STAKE", // Default Ignite token
    coinMinimalDenom: "stake", // Default Ignite token
    coinDecimals: 6,
  },
  gasPrices: {
    stake: 0.025, // Use stake as gas
  },
  // 🆕 Add gasPrice for CosmJS compatibility
  gasPrice: "0.025stake", // Format required by CosmJS
  walletName: "Test Wallet",
  explorerUrl: "http://localhost:1317",

  // 🆕 Add faucet endpoint
  faucetEndpoint: "http://localhost:4500",
  faucetAmount: "1000000", // 1 STAKE in ustake
};