import { ethers } from "hardhat";
import { expect } from "chai";

describe("TestContract", function () {
  describe("abcd", function () {
    it("should return 1234", async function () {
      const TestContract = await ethers.getContractFactory("TestContract");
      const c = await TestContract.deploy();
      expect(await c.abcd()).to.equal("1234");
    });
    it("should return 1234", async function () {
      const TestContract = await ethers.getContractFactory("TestContract");
      const c = await TestContract.deploy();
      expect(await c.abcd()).to.equal("1234");
    });
    it("should return 1234", async function () {
      const TestContract = await ethers.getContractFactory("TestContract");
      const c = await TestContract.deploy();
      expect(await c.abcd()).to.equal("1234");
    });
  });
});
