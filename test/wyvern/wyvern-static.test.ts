import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { atomicMatchArgs, HowToCall, Order, orderTypes } from "./lib";
import { expect } from "chai";

describe("static market", function () {
  async function fixture() {
    const [admin, alice, bob] = await ethers.getSigners();

    const WyvernAtomicizer = await ethers.getContractFactory("WyvernAtomicizer");
    const atomicizer = await WyvernAtomicizer.deploy();

    const WyvernExchange = await ethers.getContractFactory("WyvernExchange");
    const WyvernRegistry = await ethers.getContractFactory("WyvernRegistry");
    const WyvernStatic = await ethers.getContractFactory("WyvernStatic");
    const MockERC721 = await ethers.getContractFactory("MockERC721");

    const [registry] = await Promise.all([WyvernRegistry.deploy()]);
    const [exchange, statici, erc721] = await Promise.all([
      WyvernExchange.deploy(31337, [registry.address], "0x"),
      WyvernStatic.deploy(atomicizer.address),
      MockERC721.deploy(),
    ]);
    await registry.grantInitialAuthentication(exchange.address);

    const domain: TypedDataDomain = {
      name: await exchange.name(),
      version: await exchange.version(),
      chainId: 31337,
      verifyingContract: exchange.address,
    };

    return {
      admin,
      alice,
      bob,
      registry,
      exchange,
      statici,
      erc721,
      domain,
    };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  it("1", async function () {
    const { alice, bob, registry, exchange, statici, domain, erc721 } = await loadFixture(fixture);

    await registry.connect(alice).registerProxy();
    await registry.connect(bob).registerProxy();
    const aliceProxyAddress = await registry.proxies(await alice.getAddress());
    const bobProxyAddress = await registry.proxies(await bob.getAddress());

    await Promise.all([
      erc721.safeMint(await alice.getAddress(), 1),
      erc721.safeMint(await bob.getAddress(), 2),
      erc721.connect(alice).setApprovalForAll(aliceProxyAddress, true),
      erc721.connect(bob).setApprovalForAll(bobProxyAddress, true),
    ]);

    const order1: Order = {
      registry: registry.address,
      maker: alice.address,
      staticTarget: statici.address,
      staticSelector: statici.interface.getSighash("swapOneForOneERC721"),
      staticExtradata: ethers.utils.defaultAbiCoder.encode(
        ["address[2]", "uint256[2]"],
        [
          [erc721.address, erc721.address],
          [1, 2],
        ]
      ),
      maximumFill: 1,
      listingTime: 0,
      expirationTime: 1n << 64n,
      salt: 0,
    };
    const order2: Order = {
      registry: registry.address,
      maker: bob.address,
      staticTarget: statici.address,
      staticSelector: statici.interface.getSighash("swapOneForOneERC721"),
      staticExtradata: ethers.utils.defaultAbiCoder.encode(
        ["address[2]", "uint256[2]"],
        [
          [erc721.address, erc721.address],
          [2, 1],
        ]
      ),
      maximumFill: 1,
      listingTime: 0,
      expirationTime: 1n << 64n,
      salt: 0,
    };

    const sig1 = await alice._signTypedData(domain, orderTypes, order1);
    const sig2 = await bob._signTypedData(domain, orderTypes, order2);

    await exchange.atomicMatch_(
      ...atomicMatchArgs(
        order1,
        sig1,
        {
          target: erc721.address,
          howToCall: HowToCall.Call,
          data: erc721.interface.encodeFunctionData("transferFrom", [
            await alice.getAddress(),
            await bob.getAddress(),
            1,
          ]),
        },
        order2,
        sig2,
        {
          target: erc721.address,
          howToCall: HowToCall.Call,
          data: erc721.interface.encodeFunctionData("transferFrom", [
            await bob.getAddress(),
            await alice.getAddress(),
            2,
          ]),
        },
        ethers.constants.HashZero
      )
    );

    expect(await erc721.ownerOf(1)).to.eq(await bob.getAddress());
    expect(await erc721.ownerOf(2)).to.eq(await alice.getAddress());
  });
});
