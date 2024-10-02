import { expect } from "chai";
import hre, { ignition } from "hardhat";
import { ERC20Mock, IRentalEscrow, RentalEscrow } from "typechain-types";
import { BigNumberish, HDNodeWallet, MaxInt256 } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import Big from "big.js";
import {
  RentalEscrowProxyModule,
  RentalEscrowUpgradeModule,
} from "../../ignition/modules/RentalEscrow";

describe("RentalEscrow", function () {
  let deployer: HardhatEthersSigner;
  let whitelistCandidate: HDNodeWallet; // will be whitelisted
  let makerA: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let makerB: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let takerA: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let takerB: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );

  let rentalEscrow: RentalEscrow;
  let tokenA: ERC20Mock; // whitelisted
  let tokenB: ERC20Mock; // whitelisted
  let tokenC: ERC20Mock; // not whitelisted

  const MINT_AMOUNT = BigInt(1000000 * 1e18);

  describe("Deployment", () => {
    it("should successfully deploy two tokens and rentalEscrow Contract", async () => {
      tokenA = (await hre.ethers.deployContract("ERC20Mock", [
        "Token A",
        "TKNA",
        BigInt(18),
      ])) as unknown as ERC20Mock;
      tokenB = (await hre.ethers.deployContract("ERC20Mock", [
        "Token B",
        "TKNB",
        BigInt(18),
      ])) as unknown as ERC20Mock;
      tokenC = (await hre.ethers.deployContract("ERC20Mock", [
        "Token C",
        "TKNC",
        BigInt(18),
      ])) as unknown as ERC20Mock;

      rentalEscrow = (
        await ignition.deploy(RentalEscrowProxyModule, {
          parameters: {
            RentalEscrowModule: {
              _whitelisted: [],
              _whitelistedTokens: [
                tokenA.target as string,
                tokenB.target as string,
              ],
            },
          },
        })
      ).rentalEscrow as unknown as RentalEscrow;

      deployer = rentalEscrow.runner as HardhatEthersSigner;
    });
  });

  describe("Initialization", () => {
    it("should be correctly initialized with initializer", async () => {
      expect(await rentalEscrow.isWhitelisted(deployer)).to.be.equal(true);
      // check whitelistedTokens
      expect(await rentalEscrow.isTokenWhitelisted(tokenA.target)).to.be.equal(
        true,
      );
      expect(await rentalEscrow.isTokenWhitelisted(tokenB.target)).to.be.equal(
        true,
      );
      expect(await rentalEscrow.isTokenWhitelisted(tokenC.target)).to.be.equal(
        false,
      );
      expect(await rentalEscrow.getDealCounter()).to.be.equal(0);
    });
  });

  describe("Maker initiate deal", () => {
    it("should successfully create deal for maker", async () => {
      const tx = await deployer.sendTransaction({
        to: await makerA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx.wait();

      const rentalEscrowMakerA = rentalEscrow.connect(makerA);
      const requestAmount = hre.ethers.parseUnits("32000", 18);
      await rentalEscrowMakerA.openDeal(
        takerA.address,
        tokenA.target,
        requestAmount,
      );

      expect(await rentalEscrowMakerA.getDealCounter()).to.be.equal(1);
      const deal = await rentalEscrowMakerA.getDeal(0);
      expect(deal[0]).to.be.equal(makerA.address);
      expect(deal[1]).to.be.equal(takerA.address);
      expect(deal[2]).to.be.equal(tokenA.target);
      expect(deal[3]).to.be.equal(requestAmount);
      expect(deal[4]).to.be.equal(BigInt(0));
      expect(deal[5]).to.be.equal(BigInt(0));
      expect(deal[6]).to.be.equal(false);
      expect(deal[7]).to.be.equal(false);
      expect(deal[8]).to.be.equal(false);
      expect(deal[9]).to.be.equal(true);
    });
  });

  describe("Maker close deal", () => {
    it("should prevent non-designated maker closing deal", async () => {
      const rentalEscrowMakerB = rentalEscrow.connect(makerB);
      const rentalEscrowTakerA = rentalEscrow.connect(takerA);

      await expect(rentalEscrowMakerB.closeDeal(0)).to.be.revertedWith(
        "Only designated maker can close the deal",
      );
      await expect(rentalEscrowTakerA.closeDeal(0)).to.be.revertedWith(
        "Only designated maker can close the deal",
      );
    });
  });

  describe("Taker fund deal", () => {
    let rentalEscrowTakerA: RentalEscrow;
    let rentalEscrowTakerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    let settledAmount: string | bigint | boolean | undefined;
    let isFullySettled: string | bigint | boolean | undefined;

    const settleAmount1 = hre.ethers.parseUnits("15000", 18);
    const settleAmount2 = hre.ethers.parseUnits("15000", 18);
    const settleAmount3 = hre.ethers.parseUnits("15000", 18);
    const settleAmount4 = hre.ethers.parseUnits("2000", 18);
    it("should allow designated taker to fund any amount to deal", async () => {
      const tx1 = await deployer.sendTransaction({
        to: await makerA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx1.wait();

      const tx2 = await deployer.sendTransaction({
        to: await takerA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx2.wait();

      await tokenA.mint(takerA.address, MINT_AMOUNT);
      await tokenB.mint(takerA.address, MINT_AMOUNT);
      await tokenA.mint(takerB.address, MINT_AMOUNT);
      await tokenB.mint(takerB.address, MINT_AMOUNT);

      rentalEscrowTakerA = rentalEscrow.connect(takerA);
      rentalEscrowTakerB = rentalEscrow.connect(takerB);

      await tokenA
        .connect(takerA)
        .approve(rentalEscrowTakerA.target, MaxInt256);
      await tokenB
        .connect(takerA)
        .approve(rentalEscrowTakerA.target, MaxInt256);
      await tokenA
        .connect(takerA)
        .approve(rentalEscrowTakerB.target, MaxInt256);
      await tokenB
        .connect(takerA)
        .approve(rentalEscrowTakerB.target, MaxInt256);

      await rentalEscrowTakerA.fundDeal(0, tokenA.target, settleAmount1);

      deal = await rentalEscrowTakerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = deal.at(6);

      expect(settledAmount).to.be.equal(settleAmount1);
      expect(isFullySettled).to.be.equal(false);
    });

    it("should prevent non-designated taker from funding the deal", async () => {
      await expect(
        rentalEscrowTakerB.fundDeal(0, tokenA.target, settleAmount1),
      ).to.be.revertedWith("Only designated taker can fund the deal");
    });

    it("should prevent funding the deal with incorrect token", async () => {
      await expect(
        rentalEscrowTakerA.fundDeal(0, tokenB.target, settleAmount1),
      ).to.be.revertedWith("Incorrect token");
    });

    it("should prevent funding the deal with non-whitelisted token", async () => {
      await expect(
        rentalEscrowTakerA.fundDeal(0, tokenC.target, settleAmount1),
      ).to.be.revertedWith("Token is not whitelisted");
    });

    it("should allow taker to fund the deal with any amount, no more than requested amount", async () => {
      await rentalEscrowTakerA.fundDeal(0, tokenA.target, settleAmount2);
      await expect(
        rentalEscrowTakerA.fundDeal(0, tokenA.target, settleAmount3),
      ).to.be.revertedWith("Amount exceeds remaining requested amount");

      deal = await rentalEscrowTakerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = deal.at(6);
      expect(settledAmount).to.be.equal(settleAmount1 + settleAmount2);
      expect(isFullySettled).to.be.equal(false);

      await rentalEscrowTakerA.fundDeal(0, tokenA.target, settleAmount4);
      deal = await rentalEscrowTakerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = deal.at(6);

      expect(isFullySettled).to.be.equal(true);
    });
  });

  describe("taker approve maker to release fund", () => {
    let rentalEscrowTakerA: RentalEscrow;
    let rentalEscrowTakerB: RentalEscrow;
    let rentalEscrowMakerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    it("should allow taker to approve release fund", async () => {
      rentalEscrowTakerA = rentalEscrow.connect(takerA);
      rentalEscrowTakerB = rentalEscrow.connect(takerB);
      rentalEscrowMakerB = rentalEscrow.connect(makerB);

      expect(await rentalEscrowTakerA.canMakerReleaseFund(0)).to.be.equal(
        false,
      );
      await rentalEscrowTakerA.setIsMakerCanReleaseFund(0, true);
      expect(await rentalEscrowTakerA.canMakerReleaseFund(0)).to.be.equal(true);
    });

    it("should prevent non-designated taker to change state", async () => {
      await expect(
        rentalEscrowTakerB.setIsMakerCanReleaseFund(0, true),
      ).to.be.revertedWith("Only designated taker can approve fund release");
    });

    it("should prevent setting true if settledAmount is 0", async () => {
      const tx = await deployer.sendTransaction({
        to: await makerB.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx.wait();

      await rentalEscrowMakerB.openDeal(
        takerB.address,
        tokenB.target,
        hre.ethers.parseUnits("40000", 18),
      );

      await expect(
        rentalEscrowTakerB.setIsMakerCanReleaseFund(0, true),
      ).to.be.revertedWith("Only designated taker can approve fund release");
    });
  });

  describe("maker can release fund", () => {
    let rentalEscrowMakerA: RentalEscrow;
    let rentalEscrowMakerB: RentalEscrow;
    let rentalEscrowTakerA: RentalEscrow;
    let rentalEscrowTakerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    it("should prevent maker release fund unless taker approved to release", async () => {
      rentalEscrowMakerA = rentalEscrow.connect(makerA);
      rentalEscrowMakerB = rentalEscrow.connect(makerB);
      rentalEscrowTakerA = rentalEscrow.connect(takerA);
      rentalEscrowTakerB = rentalEscrow.connect(takerB);

      expect(await rentalEscrowTakerA.setIsMakerCanReleaseFund(0, false));
      await expect(
        rentalEscrowMakerA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith("Fund release not approved by taker");
    });

    it("should prevent non-designated maker releasing fund", async () => {
      expect(await rentalEscrowTakerA.setIsMakerCanReleaseFund(0, true));
      await expect(
        rentalEscrowMakerB.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith("Only designated maker can call to release funds");
    });

    it("should prevent maker from releasing fund amount higher than requested amount", async () => {
      await expect(
        rentalEscrowMakerA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("100000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot release amount higher than remaining requested amount",
      );
    });

    it("should allow maker from releasing any amount, but no more than settled amount", async () => {
      await rentalEscrowMakerA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowMakerA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("10000", 18),
      );

      await rentalEscrowMakerA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowMakerA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("20000", 18),
      );

      await rentalEscrowMakerA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowMakerA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("30000", 18),
      );

      await expect(
        rentalEscrowMakerA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot release amount higher than remaining requested amount",
      );
    });
  });

  describe("taker can retrieve funds", () => {
    let rentalEscrowMakerA: RentalEscrow;
    let rentalEscrowMakerB: RentalEscrow;
    let rentalEscrowTakerA: RentalEscrow;
    let rentalEscrowTakerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;

    it("should prevent taker from retrieving when deal is active", async () => {
      rentalEscrowTakerA = rentalEscrow.connect(takerA);
      rentalEscrowTakerB = rentalEscrow.connect(takerB);

      await expect(
        rentalEscrowTakerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("Deal is still active");
    });

    it("should prevent non-designated taker from retrieving", async () => {
      rentalEscrowMakerA = rentalEscrow.connect(makerA);
      rentalEscrowMakerB = rentalEscrow.connect(makerB);
      rentalEscrowTakerA = rentalEscrow.connect(takerA);
      rentalEscrowTakerB = rentalEscrow.connect(takerB);

      await rentalEscrowMakerA.closeDeal(0);
      await expect(
        rentalEscrowTakerB.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("Only designated taker can call to retrieve funds");
    });

    it("should allow taker to retrieve fund, no more than remaining settled amount", async () => {
      await rentalEscrowTakerA.retrieveFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("30000", 18),
      );
      await expect(
        rentalEscrowTakerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot retrieve amount higher than remaining settled amount",
      );

      await rentalEscrowTakerA.retrieveFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("1000", 18),
      );
      await expect(
        rentalEscrowTakerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("No settled amount remaining");
    });
  });
});
