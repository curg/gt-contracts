import { expect } from "chai";
import { ethers } from "hardhat";
import { InvestRelayer } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { onReceivedArgs, PawnContract, safeTransferFromArgs } from "./lib";
import { util } from "prettier";
import skipSpaces = util.skipSpaces;

describe("Invest Relayer", () => {
  async function fixture() {
    const [admin, alice, bob] = await ethers.getSigners();

    const InvestRelayer = await ethers.getContractFactory("InvestRelayer");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockERC721 = await ethers.getContractFactory("MockERC721");

    const [relayer, erc20, erc721] = await Promise.all([
      InvestRelayer.deploy(),
      MockERC20.deploy(),
      MockERC721.deploy(),
    ]);

    const pawnContract: PawnContract = {
      pawnTokenAddress: erc721.address,
      pawnTokenId: 1,
      payTokenAddress: erc20.address,
      debtAmount: 120,
      deadline: (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + 1000,
    };

    return {
      admin,
      alice,
      bob,
      relayer,
      erc20,
      erc721,
      pawnContract,
    };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  describe("Invest Relayer", () => {
    it("Create Pawn", async () => {
      const { alice, bob, erc721, erc20, pawnContract, relayer } = await loadFixture(fixture);
      await erc721.safeMint(alice.address, 1);
      await erc20.mint(bob.address, 100);
      await erc20.connect(bob).transfer(relayer.address, 100);
      await erc721
        .connect(alice)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          ...safeTransferFromArgs(alice.address, relayer.address, bob.address, 1, pawnContract)
        );
      expect(await erc721.ownerOf(1)).to.eq(await relayer.address);
      expect(await erc20.balanceOf(relayer.address)).to.eq(100);

      expect(await relayer.ownerOf(0)).to.eq(alice.address);
      expect(await relayer.ownerOf(1)).to.eq(bob.address);

      let pc: PawnContract = await relayer.pawnContracts(0);
      expect(pc.pawnTokenAddress).to.eq(erc721.address);
      expect(pc.pawnTokenId).to.eq(ethers.BigNumber.from(1));
      expect(pc.payTokenAddress).to.eq(erc20.address);
      expect(pc.debtAmount).to.eq(ethers.BigNumber.from(120));

      await erc20.mint(alice.address, 120);
      await erc20.connect(alice).approve(relayer.address, 120);
      await relayer.connect(alice).repay(0);

      expect(await erc20.balanceOf(relayer.address)).to.eq(220);
      pc = await relayer.pawnContracts(0);
      expect(pc.pawnTokenAddress).to.eq(ethers.constants.AddressZero);
      expect(pc.pawnTokenId).to.eq(0);

      // expect(await relayer.connect(bob).collectAssure(0)).to.be.reverted;
      expect(await relayer.connect(bob).collectPay(0)).not.to.be.reverted;
    });
  });
});
