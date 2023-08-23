import { expect } from "chai";
import { ethers } from "hardhat";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { atomicMatchArgs, Call, HowToCall, Order, orderTypes, staticCallArgs } from "./wyvern/lib";

describe("Integrate Test", function () {
  async function fixture() {
    const [admin, alice, bob] = await ethers.getSigners();

    const StaticPawnBroker = await ethers.getContractFactory("StaticPawnBroker");
    const WyvernExchange = await ethers.getContractFactory("WyvernExchange");
    const WyvernRegistry = await ethers.getContractFactory("WyvernRegistry");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const MockReceiver = await ethers.getContractFactory("MockReceiver");
    const InvestRelayer = await ethers.getContractFactory("InvestRelayer");

    const registry = await WyvernRegistry.deploy();
    const [exchange, statici, erc20, erc721, broker] = await Promise.all([
      WyvernExchange.deploy(31337, [registry.address], "0x"),
      StaticPawnBroker.deploy(),
      MockERC20.deploy(),
      MockERC721.deploy(),
      InvestRelayer.deploy(),
    ]);
    await registry.grantInitialAuthentication(exchange.address);

    await registry.connect(alice).registerProxy();
    await registry.connect(bob).registerProxy();

    const domain: TypedDataDomain = {
      name: await exchange.name(),
      version: await exchange.version(),
      chainId: 31337,
      verifyingContract: exchange.address,
    };

    /*
          struct ERC721PawnParams {
            address pawnbroker;
            address pawnTokenAddress;
            uint256 pawnTokenID;
            address debtTokenAddress;
            uint256 debtTokenAmount;
            uint256 deadline;
          }

          struct ERC20Params {
            address tokenAddress;
            uint256 amount;
          }
       */

    const now = await helpers.time.latest();

    const order1: Order = {
      registry: registry.address,
      maker: alice.address,
      staticTarget: statici.address,
      staticSelector: statici.interface.getSighash("ERC721PawnForERC20"),
      staticExtradata: ethers.utils.defaultAbiCoder.encode(
        ["(address,address,uint256,address,uint256,uint256)", "(address,uint256)"],
        [
          [broker.address, erc721.address, 100, erc20.address, 11000, now + 1000],
          [erc20.address, 10000],
        ]
      ),
      maximumFill: 1,
      listingTime: now,
      expirationTime: now + 100,
      salt: 0,
    };

    const order2: Order = {
      registry: registry.address,
      maker: bob.address,
      staticTarget: statici.address,
      staticSelector: statici.interface.getSighash("ERC20ForERC721Pawn"),
      staticExtradata: ethers.utils.defaultAbiCoder.encode(
        ["(address,uint256)", "(address,address,uint256,address,uint256,uint256)"],
        [
          [erc20.address, 10000],
          [broker.address, erc721.address, 100, erc20.address, 11000, now + 1000],
        ]
      ),
      maximumFill: 1,
      listingTime: now,
      expirationTime: now + 100,
      salt: 0,
    };

    const call1: Call = {
      target: erc721.address,
      howToCall: HowToCall.Call,
      data: erc721.interface.encodeFunctionData("safeTransferFrom(address,address,uint256,bytes)", [
        alice.address,
        broker.address,
        100,
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256", "uint256"],
          [bob.address, erc20.address, 11000, now + 1000]
        ),
      ]),
    };

    const call2: Call = {
      target: erc20.address,
      howToCall: HowToCall.Call,
      data: erc20.interface.encodeFunctionData("transferFrom", [bob.address, alice.address, 10000]),
    };

    return {
      admin,
      alice,
      bob,
      registry,
      exchange,
      statici,
      erc20,
      erc721,
      broker,
      domain,
      order1,
      order2,
      call1,
      call2,
    };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  describe("match", function () {
    it("should succeed", async function () {
      const { alice, bob, registry, exchange, erc20, erc721, broker, domain, order1, order2, call1, call2 } =
        await loadFixture(fixture);

      await erc721.safeMint(alice.address, 100);
      await erc20.mint(bob.address, 10000);
      await erc721.connect(alice).setApprovalForAll(await registry.proxies(alice.address), true);
      await erc20.connect(bob).approve(await registry.proxies(bob.address), ethers.constants.MaxUint256);

      await expect(
        exchange.atomicMatch_(
          ...atomicMatchArgs(
            order1,
            await alice._signTypedData(domain, orderTypes, order1),
            call1,
            order2,
            await bob._signTypedData(domain, orderTypes, order2),
            call2,
            ethers.constants.HashZero
          )
        )
      )
        .to.emit(broker, "ERC721Received")
        .to.changeTokenBalances(erc20, [alice.address, bob.address], [10000, -10000]);

      expect(await erc721.ownerOf(100), "owner of the pawn token").to.eq(broker.address);
    });
  });
});
