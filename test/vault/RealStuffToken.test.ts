import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { getDomain } from "../lib/eip712";
import { selfCallRequestTypes } from "../lib/metatx";

const agreement1 = ethers.utils.solidityKeccak256(["string"], ["agreement1"]);
const agreement2 = ethers.utils.solidityKeccak256(["string"], ["agreement2"]);

describe("RealStuffToken", function () {
  async function fixture() {
    const [admin, minter, pauser, whitelistAdmin, alice, bob] = await ethers.getSigners();
    const RealStuffToken = await ethers.getContractFactory("RealStuffToken");
    const token = await RealStuffToken.deploy();

    await Promise.all([
      token.grantRole(await token.MINTER_ROLE(), minter.getAddress()),
      token.grantRole(await token.PAUSER_ROLE(), pauser.getAddress()),
      token.grantRole(await token.WHITELIST_ADMIN_ROLE(), whitelistAdmin.getAddress()),
    ]);
    await token.connect(whitelistAdmin).updateAgreement(agreement1);

    return { admin, minter, pauser, whitelistAdmin, alice, bob, token };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  describe("isWhitelistedNow", function () {
    it("should return false for a fresh new account", async function () {
      const { alice, token } = await loadFixture(fixture);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });

    it("should return true for an authorized and agreed account", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(fixture);

      await token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), true);
      await token.connect(alice).agree(agreement1);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.true;
    });

    it("should return false for unauthorized accounts", async function () {
      const { alice, token } = await loadFixture(fixture);

      await token.connect(alice).agree(agreement1);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });

    it("should return false for not agreed accounts", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(fixture);

      await token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), true);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });
  });

  describe("agree", function () {
    it("should agree", async function () {
      const { alice, token } = await loadFixture(fixture);

      await expect(token.connect(alice).agree(agreement1))
        .to.emit(token, "Agreed")
        .withArgs(await alice.getAddress(), 1);

      expect(await token.isAgreed(alice.getAddress())).to.true;
    });

    it("should reject outdated hash", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(fixture);

      await token.connect(whitelistAdmin).updateAgreement(agreement2);

      await expect(token.connect(alice).agree(agreement1)).to.be.revertedWith("STWhitelist: wrong agreement hash");
    });
  });

  async function whitelistedFixture() {
    const f = await loadFixture(fixture);
    const { whitelistAdmin, alice, bob, token } = f;

    await Promise.all([
      token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), true),
      token.connect(alice).agree(agreement1),
      token.connect(whitelistAdmin).setAuthorized(bob.getAddress(), true),
      token.connect(bob).agree(agreement1),
    ]);

    return f;
  }

  it("sanity check - whitelistedFixture", async function () {
    const { alice, bob, token } = await loadFixture(whitelistedFixture);

    expect(await token.isWhitelistedNow(alice.getAddress())).to.be.true;
    expect(await token.isWhitelistedNow(bob.getAddress())).to.be.true;
  });

  describe("disagree", function () {
    it("should disagree", async function () {
      const { alice, token } = await loadFixture(whitelistedFixture);

      await expect(token.connect(alice).disagree())
        .to.emit(token, "Agreed")
        .withArgs(await alice.getAddress(), 0);

      expect(await token.isAgreed(alice.getAddress())).to.be.false;
    });

    it("should revoke agreement", async function () {
      const { alice, token } = await loadFixture(whitelistedFixture);

      await token.connect(alice).disagree();

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });
  });

  describe("updateAgreement", function () {
    it("should update agreement hash", async function () {
      const { whitelistAdmin, token } = await loadFixture(fixture);

      await expect(token.connect(whitelistAdmin).updateAgreement(agreement2))
        .to.emit(token, "AgreementUpdated")
        .withArgs(agreement2, 2);

      expect(await token.agreementHash()).to.eq(agreement2);
      expect(await token.latestVersion()).to.eq(2);
    });

    it("should invalidate all agreements", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(fixture);

      await token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), true);
      await token.connect(alice).agree(agreement1);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.true;

      await token.connect(whitelistAdmin).updateAgreement(agreement2);

      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });

    it("should be reverted if the caller has no proper role", async function () {
      const { admin, token } = await loadFixture(fixture);

      await expect(token.connect(admin).updateAgreement(agreement2)).to.be.revertedWith(
        /^AccessControl: account .+ is missing role .+$/
      );
    });
  });

  describe("setAuthorized", function () {
    it("should set authorized", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(whitelistedFixture);

      expect(await token.isAuthorized(alice.getAddress())).to.be.true;

      await expect(token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), false))
        .to.emit(token, "AuthorizedChanged")
        .withArgs(await alice.getAddress(), false);

      expect(await token.isAuthorized(alice.getAddress())).to.be.false;
      expect(await token.isWhitelistedNow(alice.getAddress())).to.be.false;
    });

    it("should be reverted if the caller has no proper role", async function () {
      const { admin, alice, token } = await loadFixture(whitelistedFixture);

      await expect(token.connect(admin).setAuthorized(alice.getAddress(), true)).to.be.revertedWith(
        /^AccessControl: account .+ is missing role .+$/
      );
    });
  });

  describe("mint", function () {
    it("should mint token", async function () {
      const { minter, whitelistAdmin, alice, token } = await loadFixture(whitelistedFixture);

      await token.connect(whitelistAdmin).setAuthorized(alice.getAddress(), true);
      await token.connect(alice).agree(agreement1);

      await expect(token.connect(minter).safeMint(alice.getAddress(), 10))
        .to.emit(token, "Transfer")
        .withArgs(ethers.constants.AddressZero, await alice.getAddress(), 10);
      expect(await token.ownerOf(10)).to.eq(await alice.getAddress());
    });

    it("should be reverted if the recipient is not whitelisted", async function () {
      const { minter, alice, token } = await loadFixture(fixture);

      await expect(token.connect(minter).safeMint(alice.getAddress(), 10)).to.be.revertedWith(
        "RealStuffToken: recipient not whitelisted"
      );
    });

    it("should be reverted if the caller has no proper role", async function () {
      const { admin, alice, token } = await loadFixture(whitelistedFixture);

      await expect(token.connect(admin).setAuthorized(alice.getAddress(), true)).to.be.revertedWith(
        /^AccessControl: account .+ is missing role .+$/
      );
    });
  });

  async function mintedFixture() {
    const f = await loadFixture(whitelistedFixture);
    const { minter, alice, bob, token } = f;

    await Promise.all([
      token.connect(minter).safeMint(alice.getAddress(), 10),
      token.connect(minter).safeMint(bob.getAddress(), 20),
    ]);

    return f;
  }

  it("sanity check - mintedFixture", async function () {
    const { alice, bob, token } = await loadFixture(mintedFixture);

    expect(await token.ownerOf(10)).to.eq(await alice.getAddress());
    expect(await token.ownerOf(20)).to.eq(await bob.getAddress());
  });

  describe("transfer", function () {
    it("should transfer", async function () {
      const { alice, bob, token } = await loadFixture(mintedFixture);

      await expect(token.connect(alice).transferFrom(alice.getAddress(), bob.getAddress(), 10))
        .to.emit(token, "Transfer")
        .withArgs(await alice.getAddress(), await bob.getAddress(), 10);
      expect(await token.ownerOf(10)).to.eq(await bob.getAddress());
    });

    it("should be reverted if the recipient is not whitelisted", async function () {
      const { alice, bob, token } = await loadFixture(mintedFixture);

      await token.connect(bob).disagree();

      await expect(token.connect(alice).transferFrom(alice.getAddress(), bob.getAddress(), 10)).to.be.revertedWith(
        "RealStuffToken: recipient not whitelisted"
      );
    });
  });

  describe("pause", function () {
    it("should pause", async function () {
      const { pauser, token } = await loadFixture(fixture);

      await expect(token.connect(pauser).pause()).to.emit(token, "Paused");
      expect(await token.paused()).to.be.true;
    });

    it("should make all transfers revert", async function () {
      const { pauser, alice, bob, token } = await loadFixture(mintedFixture);

      await token.connect(pauser).pause();

      await expect(token.connect(alice).transferFrom(alice.getAddress(), bob.getAddress(), 10)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("metatx", function () {
    it("set authorized and agree", async function () {
      const { whitelistAdmin, alice, token } = await loadFixture(fixture);

      const req = {
        data: token.interface.encodeFunctionData("setAuthorized", [await alice.getAddress(), true]),
        deadline: 1n << 63n,
        salt: 0,
      };
      const signature = await whitelistAdmin._signTypedData(await getDomain(token), selfCallRequestTypes, req);

      await token.connect(alice).batchExecute([
        {
          req: { data: token.interface.encodeFunctionData("agree", [agreement1]), deadline: 1n << 63n, salt: 0 },
          signature: "0x",
        },
        { req, signature },
      ]);

      expect(await token.isWhitelistedNow(alice.getAddress()), "white").to.be.true;
    });

    it("mint", async function () {
      const { minter, alice, token } = await loadFixture(whitelistedFixture);

      const req = {
        data: token.interface.encodeFunctionData("safeMint", [await alice.getAddress(), 15]),
        deadline: 1n << 63n,
        salt: 0,
      };
      const signature = await minter._signTypedData(await getDomain(token), selfCallRequestTypes, req);

      await token.connect(alice).execute(req, signature);

      expect(await token.ownerOf(15), "white").to.eq(await alice.getAddress());
    });
  });
});
