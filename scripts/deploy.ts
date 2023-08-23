import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const InvestRealyer = await ethers.deployContract("InvestRelayer");
  const StaticPawnBroker = await ethers.deployContract("StaticPawnBroker");
  const RealStuffToken = await ethers.deployContract("RealStuffToken");
  const WyvernRegistry = await ethers.deployContract("WyvernRegistry");
  const wyvernExchange = await ethers.getContractFactory("WyvernExchange");
  const WyvernExchange = await wyvernExchange.deploy(31337, [WyvernRegistry.address], "0x");

  console.log("InvestRealyer address:", InvestRealyer.address);
  console.log("StaticPawnBroker address:", StaticPawnBroker.address);
  console.log("RealStuffToken address:", RealStuffToken.address);
  console.log("WyvernRegistry address:", WyvernRegistry.address);
  console.log("WyvernExchange address:", WyvernExchange.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
