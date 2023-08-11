import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        // golden teeth contracts compiler
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      {
        // wyvern v3 exchange compiler
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 750,
          },
        },
      },
    ],
  },
};

export default config;
