import { expect } from "chai";
import { ethers } from "hardhat";
import { InvestRelayer } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { onReceivedArgs, PawnContract } from "./lib";

describe("Invest Relayer", () => {
  async function fixture() {
    const [admin, alice, bob, wyvern] = await ethers.getSigners();

    const InvestRelayer = await ethers.getContractFactory("InvestRelayer");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockERC721 = await ethers.getContractFactory("MockERC721");

    const [relayer, erc20, erc721] = await Promise.all([
      InvestRelayer.deploy(),
      MockERC20.deploy(),
      MockERC721.deploy(),
    ]);

    const pawnContract: PawnContract = {
      id: 1,
      pawnTokenAddress: erc721.address,
      pawnTokenId: 1,
      payTokenAddress: erc20.address,
      debtAmount: 100,
      deadline: 100,
    };

    return {
      admin,
      alice,
      bob,
      wyvern,
      relayer,
      erc20,
      erc721,
      pawnContract,
    };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  describe("createPawnContract", () => {
    it("should not reverted", async () => {
      const { alice, bob, wyvern, relayer, pawnContract } = await loadFixture(fixture);

      await expect(
        relayer.onERC721Received(...onReceivedArgs(wyvern.address, alice.address, 1, pawnContract, bob.address))
      ).not.to.reverted;
    });
  });
});
