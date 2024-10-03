import { expect } from "chai";
import hre, { ignition } from "hardhat";
import { EHKD, ERC20Mock, IRentalEscrow, RentalEscrow } from "typechain-types";
import { BigNumberish, HDNodeWallet, MaxInt256 } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import Big from "big.js";
import { eHKDModule } from "../../ignition/modules/eHKD";

describe("eHKD", function () {
  let admin: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );
  let tokenVault: HDNodeWallet = hre.ethers.Wallet.createRandom().connect(
    hre.ethers.provider,
  );

  let eHKD: EHKD;
  let tokenA: ERC20Mock; // whitelisted
  let tokenB: ERC20Mock; // whitelisted
  let tokenC: ERC20Mock; // not whitelisted

  const MINT_AMOUNT = hre.ethers.parseUnits("1000000", 18);

  describe("Deployment", () => {
    it("should successfully deploy two tokens and rentalEscrow Contract", async () => {
      eHKD = (
        await ignition.deploy(eHKDModule, {
          parameters: {
            eHKDModule: {
              _admin: admin.address,
              _tokenVault: tokenVault.address,
              mintAmount: MINT_AMOUNT,
            },
          },
        })
      ).token as unknown as EHKD;
    });
  });

  describe("Initialization", () => {
    it("should be correctly initialized with initializer", async () => {
      expect(await eHKD.admin()).to.be.equal(admin.address);
      expect(await eHKD.tokenVault()).to.be.equal(tokenVault.address);
      expect(await eHKD.balanceOf(tokenVault.address)).to.be.equal(MINT_AMOUNT);
    });
  });
});
