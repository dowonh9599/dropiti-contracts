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
  let payeeA: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let payeeB: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let payerA: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let payerB: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
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

  describe("Payee initiate deal", () => {
    it("should successfully create deal for payee", async () => {
      const tx = await deployer.sendTransaction({
        to: await payeeA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx.wait();

      const rentalEscrowPayeeA = rentalEscrow.connect(payeeA);
      const requestAmount = hre.ethers.parseUnits("32000", 18);
      await rentalEscrowPayeeA.openDeal(
        payerA.address,
        tokenA.target,
        requestAmount,
      );

      expect(await rentalEscrowPayeeA.getDealCounter()).to.be.equal(1);
      const deal = await rentalEscrowPayeeA.getDeal(0);
      expect(deal[0]).to.be.equal(payeeA.address);
      expect(deal[1]).to.be.equal(payerA.address);
      expect(deal[2]).to.be.equal(tokenA.target);
      expect(deal[3]).to.be.equal(requestAmount);
      expect(deal[4]).to.be.equal(BigInt(0));
      expect(deal[5]).to.be.equal(BigInt(0));
      expect(deal[6]).to.be.equal(false);
      expect(deal[7]).to.be.equal(true);
    });
  });

  describe("Payee close deal", () => {
    it("should prevent non-designated payee closing deal", async () => {
      const rentalEscrowPayeeB = rentalEscrow.connect(payeeB);
      const rentalEscrowPayerA = rentalEscrow.connect(payerA);

      await expect(rentalEscrowPayeeB.closeDeal(0)).to.be.revertedWith(
        "Only designated payee can close the deal",
      );
      await expect(rentalEscrowPayerA.closeDeal(0)).to.be.revertedWith(
        "Only designated payee can close the deal",
      );
    });
  });

  describe("Payer fund deal", () => {
    let rentalEscrowPayerA: RentalEscrow;
    let rentalEscrowPayerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    let settledAmount: string | bigint | boolean | undefined;
    let isFullySettled: string | bigint | boolean | undefined;

    const settleAmount1 = hre.ethers.parseUnits("15000", 18);
    const settleAmount2 = hre.ethers.parseUnits("15000", 18);
    const settleAmount3 = hre.ethers.parseUnits("15000", 18);
    const settleAmount4 = hre.ethers.parseUnits("2000", 18);
    it("should allow designated payer to fund any amount to deal", async () => {
      const tx1 = await deployer.sendTransaction({
        to: await payeeA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx1.wait();

      const tx2 = await deployer.sendTransaction({
        to: await payerA.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx2.wait();

      await tokenA.mint(payerA.address, MINT_AMOUNT);
      await tokenB.mint(payerA.address, MINT_AMOUNT);
      await tokenA.mint(payerB.address, MINT_AMOUNT);
      await tokenB.mint(payerB.address, MINT_AMOUNT);

      rentalEscrowPayerA = rentalEscrow.connect(payerA);
      rentalEscrowPayerB = rentalEscrow.connect(payerB);

      await tokenA
        .connect(payerA)
        .approve(rentalEscrowPayerA.target, MaxInt256);
      await tokenB
        .connect(payerA)
        .approve(rentalEscrowPayerA.target, MaxInt256);
      await tokenA
        .connect(payerA)
        .approve(rentalEscrowPayerB.target, MaxInt256);
      await tokenB
        .connect(payerA)
        .approve(rentalEscrowPayerB.target, MaxInt256);

      await rentalEscrowPayerA.fundDeal(0, tokenA.target, settleAmount1);

      deal = await rentalEscrowPayerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = deal.at(6);

      expect(settledAmount).to.be.equal(settleAmount1);
      expect(isFullySettled).to.be.equal(false);
    });

    it("should prevent non-designated payer from funding the deal", async () => {
      await expect(
        rentalEscrowPayerB.fundDeal(0, tokenA.target, settleAmount1),
      ).to.be.revertedWith("Only designated payer can fund the deal");
    });

    it("should prevent funding the deal with incorrect token", async () => {
      await expect(
        rentalEscrowPayerA.fundDeal(0, tokenB.target, settleAmount1),
      ).to.be.revertedWith("Incorrect token");
    });

    it("should prevent funding the deal with non-whitelisted token", async () => {
      await expect(
        rentalEscrowPayerA.fundDeal(0, tokenC.target, settleAmount1),
      ).to.be.revertedWith("Token is not whitelisted");
    });

    it("should allow payer to fund the deal with any amount, no more than requested amount", async () => {
      await rentalEscrowPayerA.fundDeal(0, tokenA.target, settleAmount2);
      await expect(
        rentalEscrowPayerA.fundDeal(0, tokenA.target, settleAmount3),
      ).to.be.revertedWith("Amount exceeds remaining requested amount");

      deal = await rentalEscrowPayerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = deal.at(6);
      expect(settledAmount).to.be.equal(settleAmount1 + settleAmount2);
      expect(isFullySettled).to.be.equal(false);

      await rentalEscrowPayerA.fundDeal(0, tokenA.target, settleAmount4);
      deal = await rentalEscrowPayerA.getDeal(0);
      settledAmount = deal.at(4);
      isFullySettled = await rentalEscrowPayerA.isPayerFullySettled(0);

      expect(isFullySettled).to.be.equal(true);
    });
  });

  describe("payer approve payee to release fund", () => {
    let rentalEscrowPayerA: RentalEscrow;
    let rentalEscrowPayerB: RentalEscrow;
    let rentalEscrowPayeeB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    it("should allow payer to approve release fund", async () => {
      rentalEscrowPayerA = rentalEscrow.connect(payerA);
      rentalEscrowPayerB = rentalEscrow.connect(payerB);
      rentalEscrowPayeeB = rentalEscrow.connect(payeeB);

      expect(await rentalEscrowPayerA.canPayeeReleaseFund(0)).to.be.equal(
        false,
      );
      await rentalEscrowPayerA.setIsPayeeCanReleaseFund(0, true);
      expect(await rentalEscrowPayerA.canPayeeReleaseFund(0)).to.be.equal(true);
    });

    it("should prevent non-designated payer to change state", async () => {
      await expect(
        rentalEscrowPayerB.setIsPayeeCanReleaseFund(0, true),
      ).to.be.revertedWith("Only designated payer can approve fund release");
    });

    it("should prevent setting true if settledAmount is 0", async () => {
      const tx = await deployer.sendTransaction({
        to: await payeeB.getAddress(),
        value: hre.ethers.parseEther("1.0"), // Sending 1 ETH
      });
      await tx.wait();

      await rentalEscrowPayeeB.openDeal(
        payerB.address,
        tokenB.target,
        hre.ethers.parseUnits("40000", 18),
      );

      await expect(
        rentalEscrowPayerB.setIsPayeeCanReleaseFund(0, true),
      ).to.be.revertedWith("Only designated payer can approve fund release");
    });
  });

  describe("payee can release fund", () => {
    let rentalEscrowPayeeA: RentalEscrow;
    let rentalEscrowPayeeB: RentalEscrow;
    let rentalEscrowPayerA: RentalEscrow;
    let rentalEscrowPayerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;
    it("should prevent payee release fund unless payer approved to release", async () => {
      rentalEscrowPayeeA = rentalEscrow.connect(payeeA);
      rentalEscrowPayeeB = rentalEscrow.connect(payeeB);
      rentalEscrowPayerA = rentalEscrow.connect(payerA);
      rentalEscrowPayerB = rentalEscrow.connect(payerB);

      expect(await rentalEscrowPayerA.setIsPayeeCanReleaseFund(0, false));
      await expect(
        rentalEscrowPayeeA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith("Fund release not approved by payer");
    });

    it("should prevent non-designated payee releasing fund", async () => {
      expect(await rentalEscrowPayerA.setIsPayeeCanReleaseFund(0, true));
      await expect(
        rentalEscrowPayeeB.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith("Only designated payee can call to release funds");
    });

    it("should prevent payee from releasing fund amount higher than requested amount", async () => {
      await expect(
        rentalEscrowPayeeA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("100000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot release amount higher than remaining requested amount",
      );
    });

    it("should allow payee from releasing any amount, but no more than settled amount", async () => {
      await rentalEscrowPayeeA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowPayeeA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("10000", 18),
      );

      await rentalEscrowPayeeA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowPayeeA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("20000", 18),
      );

      await rentalEscrowPayeeA.releaseFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("10000", 18),
      );
      expect(await rentalEscrowPayeeA.getReleasedAmount(0)).to.be.equal(
        hre.ethers.parseUnits("30000", 18),
      );

      await expect(
        rentalEscrowPayeeA.releaseFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("10000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot release amount higher than remaining requested amount",
      );
    });
  });

  describe("payer can retrieve funds", () => {
    let rentalEscrowPayeeA: RentalEscrow;
    let rentalEscrowPayeeB: RentalEscrow;
    let rentalEscrowPayerA: RentalEscrow;
    let rentalEscrowPayerB: RentalEscrow;

    let deal: IRentalEscrow.DealStructOutput;

    it("should prevent payer from retrieving when deal is active", async () => {
      rentalEscrowPayerA = rentalEscrow.connect(payerA);
      rentalEscrowPayerB = rentalEscrow.connect(payerB);

      await expect(
        rentalEscrowPayerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("Deal is still active");
    });

    it("should prevent non-designated payer from retrieving", async () => {
      rentalEscrowPayeeA = rentalEscrow.connect(payeeA);
      rentalEscrowPayeeB = rentalEscrow.connect(payeeB);
      rentalEscrowPayerA = rentalEscrow.connect(payerA);
      rentalEscrowPayerB = rentalEscrow.connect(payerB);

      await rentalEscrowPayeeA.closeDeal(0);
      await expect(
        rentalEscrowPayerB.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("Only designated payer can call to retrieve funds");
    });

    it("should allow payer to retrieve fund, no more than remaining settled amount", async () => {
      await rentalEscrowPayerA.retrieveFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("500", 18),
      );
      await rentalEscrowPayerA.retrieveFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("1000", 18),
      );
      await expect(
        rentalEscrowPayerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith(
        "Cannot retrieve amount higher than remaining settled amount",
      );
      await rentalEscrowPayerA.retrieveFunds(
        0,
        tokenA.target,
        hre.ethers.parseUnits("500", 18),
      );
      await expect(
        rentalEscrowPayerA.retrieveFunds(
          0,
          tokenA.target,
          hre.ethers.parseUnits("1000", 18),
        ),
      ).to.be.revertedWith("No settled amount remaining");
    });
  });
});
