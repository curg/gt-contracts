import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getDomain } from "../lib/eip712";
import { selfCallRequestTypes } from "../lib/metatx";
import { encodeError } from "../lib/abi";

describe("SelfCallMetaTransaction", function () {
  async function fixture() {
    const [alice, bob] = await ethers.getSigners();
    const MockSelfCallMetaTransaction = await ethers.getContractFactory("MockSelfCallMetaTransaction");
    const contract = await MockSelfCallMetaTransaction.deploy();

    return { contract, alice, bob };
  }

  before(async function () {
    await loadFixture(fixture);
  });

  describe("getHashAndSigner", function () {
    it("should return sender for empty signature", async function () {
      const { contract, bob } = await loadFixture(fixture);

      const { hash, signer } = await contract.connect(bob).getHashAndSigner(
        {
          data: "0x",
          deadline: 0,
          salt: 0,
        },
        "0x"
      );

      expect(hash).to.eq(ethers.constants.HashZero);
      expect(signer).to.eq(await bob.getAddress());
    });

    it("should return recovered address for valid signature", async function () {
      const { contract, alice, bob } = await loadFixture(fixture);
      const req = {
        data: "0x",
        deadline: 0,
        salt: 0,
      };

      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      const { hash, signer } = await contract.connect(bob).getHashAndSigner(req, signature);

      expect(hash).to.eq(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes32", "uint256", "uint256"],
            [await alice.getAddress(), ethers.utils.keccak256(req.data), req.deadline, req.salt]
          )
        )
      );
      expect(signer).to.eq(await alice.getAddress());
    });
  });

  describe("execute", function () {
    it("should forward with original sender for empty signature", async function () {
      const { contract, bob } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature = "0x";

      const { hash } = await contract.getHashAndSigner(req, signature);

      await expect(contract.connect(bob).execute(req, signature))
        .to.emit(contract, "Executed")
        .withArgs(hash, true, ethers.utils.defaultAbiCoder.encode(["address"], [await bob.getAddress()]));
    });

    it("should forward with recovered sender for valid signature", async function () {
      const { contract, alice, bob } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      const { hash } = await contract.getHashAndSigner(req, signature);

      await expect(contract.connect(bob).execute(req, signature))
        .to.emit(contract, "Executed")
        .withArgs(hash, true, ethers.utils.defaultAbiCoder.encode(["address"], [await alice.getAddress()]));
    });

    it("should reject expired requests", async function () {
      const { contract, alice, bob } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 0, salt: 0 };
      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      await expect(contract.connect(bob).execute(req, signature)).to.be.revertedWith(
        "SelfCallMetaTransaction: deadline exceeded"
      );
    });

    it("should reject double spend", async function () {
      const { contract, alice } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      await expect(contract.execute(req, signature));
      await expect(contract.execute(req, signature)).to.be.revertedWith("SelfCallMetaTransaction: already executed");
    });

    it("should allow double spend from sender", async function () {
      const { contract, bob } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature = "0x";

      await expect(contract.connect(bob).execute(req, signature));
      await expect(contract.connect(bob).execute(req, signature)).not.to.be.reverted;
    });
  });

  describe("bacthExecute", function () {
    it("should forward mixture of valid and empty signatures", async function () {
      const { contract, alice, bob } = await loadFixture(fixture);

      const req1 = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature1 = "0x";
      const { hash: hash1 } = await contract.getHashAndSigner(req1, signature1);

      const req2 = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature2 = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req2);
      const { hash: hash2 } = await contract.getHashAndSigner(req2, signature2);

      await expect(
        contract.connect(bob).batchExecute([
          { req: req1, signature: signature1 },
          { req: req2, signature: signature2 },
        ])
      )
        .to.emit(contract, "Executed")
        .withArgs(hash1, true, ethers.utils.defaultAbiCoder.encode(["address"], [await bob.getAddress()]))
        .to.emit(contract, "Executed")
        .withArgs(hash2, true, ethers.utils.defaultAbiCoder.encode(["address"], [await alice.getAddress()]));
    });

    it("should reject double spend within one batch", async function () {
      const { contract, alice } = await loadFixture(fixture);
      const req = { data: contract.interface.encodeFunctionData("msgSender"), deadline: 1n << 63n, salt: 0 };
      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      await expect(
        contract.batchExecute([
          { req, signature },
          { req, signature },
        ])
      ).to.be.revertedWith("SelfCallMetaTransaction: already executed");
    });

    it("should not be reverted even if one of the calls is reverted", async function () {
      const { contract, alice } = await loadFixture(fixture);

      const req = { data: contract.interface.encodeFunctionData("revertYay"), deadline: 1n << 63n, salt: 0 };
      const signature = await alice._signTypedData(await getDomain(contract), selfCallRequestTypes, req);

      const { hash } = await contract.getHashAndSigner(req, signature);

      await expect(
        contract.connect(alice).batchExecute([
          { req, signature },
          {
            req: {
              data: contract.interface.encodeFunctionData("revertYay"),
              deadline: 1n << 63n,
              salt: 0,
            },
            signature: "0x",
          },
        ])
      )
        .to.emit(contract, "Executed")
        .withArgs(hash, false, encodeError("yay"));
    });
  });
});
