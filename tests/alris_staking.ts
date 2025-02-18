import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { AlrisStakingProgram } from "./stake";
import { BN, web3 } from "@coral-xyz/anchor";
describe("alris_staking", () => {
  let userKeypair: web3.Keypair;
  let program: AlrisStakingProgram["program"];
  let alrisProgramApi: AlrisStakingProgram;
  let minDuration: BN;
  let maxDuration: BN;
  let baseWeight: BN;
  let maxWeight: BN;
  before(async () => {
    userKeypair = web3.Keypair.generate();
    minDuration = new BN(1296000); // 15 days
    maxDuration = new BN(31536000); // 365 days
    baseWeight = new BN(1_000_000_000);
    maxWeight = new BN(4_000_000_000); // max staker get 4x rewards for max duration
    alrisProgramApi = AlrisStakingProgram.getInstance();
    program = alrisProgramApi.program;
    await program.provider.connection.requestAirdrop(userKeypair.publicKey, 1000000000);
    await createMint(
      program.provider.connection,
      alrisProgramApi.wallet.payer,
      alrisProgramApi.admin.publicKey,
      null,
      6,
      alrisProgramApi.alrMintKeyPair,
      undefined,
      TOKEN_PROGRAM_ID
    );
    const userAta = await getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      alrisProgramApi.wallet.payer,
      alrisProgramApi.alrMint,
      userKeypair.publicKey
    );
    const rewardMintAta = await getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      alrisProgramApi.wallet.payer,
      alrisProgramApi.rewardMint,
      userKeypair.publicKey
    );
    await mintTo(
      program.provider.connection,
      alrisProgramApi.wallet.payer,
      alrisProgramApi.alrMint,
      userAta.address,
      alrisProgramApi.admin.publicKey,
      1000_000_000_000, // 1000_000 ALR
      [alrisProgramApi.admin]
    );
  });
  it("Is initialized!", async () => {
    try {
      const stakePool = await alrisProgramApi.initialize(
        maxWeight,
        minDuration,
        maxDuration,
      );
      alrisProgramApi.displayAccount(stakePool, "stakePool");
    } catch (error) {
      console.log(await error.getLogs());
    }
  });
  it("Deposit", async () => {
    await alrisProgramApi.addFundsToRewardVault(1000_000_000_000);
    const { stakePool, stakeDepositReceipt } = await alrisProgramApi.deposit(
      1,
      new BN(1_000_000_000), // 1000 ALRIS
      minDuration,
      userKeypair,
    );
    alrisProgramApi.displayAccount(stakePool, "stakePool");
    alrisProgramApi.displayAccount(stakeDepositReceipt, "stakeDepositReceipt");
  });
});
