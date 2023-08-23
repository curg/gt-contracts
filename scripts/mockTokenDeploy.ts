import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MockERC721 = await ethers.deployContract("MockERC721");
  const MockERC20 = await ethers.deployContract("MockERC20");

  console.log("MockERC721 address:", MockERC721.address);
  console.log("MockERC20 address:", MockERC20.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
