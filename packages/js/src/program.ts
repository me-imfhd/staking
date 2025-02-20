import { AnchorProvider, BN, IdlAccounts, utils } from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { AlrisStaking, _AlrisStakingIDL } from "./idl";
import {
  ADMIN_PUBLIC_KEY,
  ALR_MINT,
  ALR_STAKING_PROGRAM_ID,
  REWARD_MINT,
} from "./constants";
import { StakePool } from "./types";

export class AlrisStakingProgram {
  private program: Program<AlrisStaking>;
  private wallet: web3.PublicKey;
  constructor(provider: AnchorProvider) {
    this.program = new Program(
      _AlrisStakingIDL as unknown as AlrisStaking,
      ALR_STAKING_PROGRAM_ID,
      provider
    );
    this.wallet = provider.publicKey;
  }

  get stakePoolPda(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [
        new BN(1).toArrayLike(Buffer, "le", 1),
        ALR_MINT.toBuffer(),
        ADMIN_PUBLIC_KEY.toBuffer(),
        Buffer.from("stakePool"),
      ],
      this.program.programId
    )[0];
  }
  get vaultPda(): web3.PublicKey {
    const stakePoolKey = this.stakePoolPda;
    return web3.PublicKey.findProgramAddressSync(
      [stakePoolKey.toBuffer(), Buffer.from("vault", "utf-8")],
      this.program.programId
    )[0];
  }
  get rewardVaultPda(): web3.PublicKey {
    const stakePoolKey = this.stakePoolPda;
    return web3.PublicKey.findProgramAddressSync(
      [
        stakePoolKey.toBuffer(),
        REWARD_MINT.toBuffer(),
        Buffer.from("rewardVault", "utf-8"),
      ],
      this.program.programId
    )[0];
  }
  get stakeMint(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [this.stakePoolPda.toBuffer(), Buffer.from("stakeMint", "utf-8")],
      this.program.programId
    )[0];
  }

  getAta(mint: web3.PublicKey, owner: web3.PublicKey): web3.PublicKey {
    return utils.token.associatedAddress({
      mint,
      owner,
    });
  }
  getStakeDepositReceiptPda(
    nonce: number,
    owner: web3.PublicKey,
    stakePool: web3.PublicKey
  ): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        stakePool.toBuffer(),
        new BN(nonce).toArrayLike(Buffer, "le", 4),
        Buffer.from("stakeDepositReceipt", "utf-8"),
      ],
      this.program.programId
    )[0];
  }
  async getOrCreateTokenAccountInstruction(mint: web3.PublicKey): Promise<{
    instruction: web3.TransactionInstruction | null;
    ata: web3.PublicKey;
  }> {
    const userTokenAccountAddress = this.getAta(mint, this.wallet);
    const userTokenAccount =
      await this.program.provider.connection.getParsedAccountInfo(
        userTokenAccountAddress
      );
    if (userTokenAccount.value === null) {
      return {
        instruction: createAssociatedTokenAccountInstruction(
          this.wallet,
          userTokenAccountAddress,
          this.wallet,
          mint
        ),
        ata: userTokenAccountAddress,
      };
    } else {
      return {
        instruction: null,
        ata: userTokenAccountAddress,
      };
    }
  }
  async getStakePool(): Promise<StakePool> {
    return this.program.account.stakePool.fetch(this.stakePoolPda);
  }
  async initialize(
    maxWeight: BN,
    minDuration: BN,
    maxDuration: BN
  ): Promise<{
    stakePool: IdlAccounts<AlrisStaking>["stakePool"];
    tx_hash: string;
  }> {
    let intialize_stake_pool_ix = await this.program.methods
      .initializeStakePool(1, maxWeight, minDuration, maxDuration)
      .accounts({
        authority: ADMIN_PUBLIC_KEY,
        mint: ALR_MINT,
        stakePool: this.stakePoolPda,
        stakeMint: this.stakeMint,
        vault: this.vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        payer: this.wallet,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    let add_reward_pool_ix = await this.program.methods
      .addRewardPool(0)
      .accounts({
        rewardMint: REWARD_MINT,
        rewardVault: this.rewardVaultPda,
        authority: ADMIN_PUBLIC_KEY,
        stakePool: this.stakePoolPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        payer: this.wallet,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    let flags_ix = await this.program.methods
      .setFlags(0b0000_0000)
      .accounts({
        authority: ADMIN_PUBLIC_KEY,
        stakePool: this.stakePoolPda,
      })
      .instruction();
    const tx = new web3.Transaction().add(
      intialize_stake_pool_ix,
      add_reward_pool_ix,
      flags_ix
    );
    let tx_hash = await this.program.provider.sendAndConfirm(tx);

    console.log("tx_hash", tx_hash);
    return {
      stakePool: await this.program.account.stakePool.fetch(this.stakePoolPda),
      tx_hash,
    };
  }
  async addFundsToRewardVault(amount: number) {
    const ix = createMintToInstruction(
      REWARD_MINT,
      this.rewardVaultPda,
      this.wallet,
      amount
    );
    const tx = new web3.Transaction().add(ix);
    let tx_hash = await this.program.provider.sendAndConfirm(tx);
    return tx_hash;
  }

  /**
   * Batch request AccountInfo for StakeDepositReceipts
   */
  async getNextUnusedStakeReceiptNonce(owner: web3.PublicKey) {
    const pageSize = 10;
    const maxIndex = 4_294_967_295;
    const maxPage = Math.ceil(maxIndex / pageSize);
    for (let page = 0; page <= maxPage; page++) {
      const startIndex = page * pageSize;
      const stakeReceiptKeys: web3.PublicKey[] = [];
      // derive keys for batch
      for (let i = startIndex; i < startIndex + pageSize; i++) {
        const stakeReceiptKey = this.getStakeDepositReceiptPda(
          i,
          owner,
          this.stakePoolPda
        );
        stakeReceiptKeys.push(stakeReceiptKey);
      }
      // fetch page of AccountInfo for stake receipts
      const accounts =
        await this.program.provider.connection.getMultipleAccountsInfo(
          stakeReceiptKeys
        );
      const indexWithinPage = accounts.findIndex((a) => !a);
      if (indexWithinPage > -1) {
        return startIndex + indexWithinPage;
      }
    }
    throw new Error("No more nonces available");
  }
  async deposit(
    amount: BN,
    lockupDuration: BN
  ): Promise<{
    tx_hash: string;
    stakeDepositReceipt: IdlAccounts<AlrisStaking>["stakeDepositReceipt"];
    stakePool: IdlAccounts<AlrisStaking>["stakePool"];
  }> {
    const userALRMintTokenAccount = this.getAta(ALR_MINT, this.wallet);

    const {
      ata: userStakeMintTokenAccount,
      instruction: userStakeMintTokenAccountInstruction,
    } = await this.getOrCreateTokenAccountInstruction(this.stakeMint);

    const nonce = await this.getNextUnusedStakeReceiptNonce(this.wallet);

    const stakeDepositReceiptPda = this.getStakeDepositReceiptPda(
      nonce,
      this.wallet,
      this.stakePoolPda
    );
    if (amount.isZero()) {
      throw new Error("Amount must be greater than 0");
    }
    let txBuilder = this.program.methods
      .deposit(nonce, amount, lockupDuration)
      .accounts({
        stakePool: this.stakePoolPda,
        destination: userStakeMintTokenAccount,
        from: userALRMintTokenAccount, // User should already have ALR in their wallet
        owner: this.wallet,
        payer: this.wallet,
        stakeMint: this.stakeMint,
        rent: web3.SYSVAR_RENT_PUBKEY,
        stakeDepositReceipt: stakeDepositReceiptPda,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        vault: this.vaultPda,
      })
      .remainingAccounts([
        {
          isSigner: false,
          isWritable: true,
          pubkey: this.rewardVaultPda,
        },
      ]);

    if (userStakeMintTokenAccountInstruction) {
      txBuilder = txBuilder.preInstructions([
        userStakeMintTokenAccountInstruction,
      ]);
    }

    let tx = await txBuilder.rpc();
    console.log("tx_hash", tx);
    const stakeDepositReceipt =
      await this.program.account.stakeDepositReceipt.fetch(
        stakeDepositReceiptPda
      );
    const stakePool = await this.program.account.stakePool.fetch(
      this.stakePoolPda
    );
    return {
      tx_hash: tx,
      stakeDepositReceipt,
      stakePool,
    };
  }
}

export function displayAccount<
  B extends keyof IdlAccounts<AlrisStaking>,
  T extends IdlAccounts<AlrisStaking>[B]
>(account: T, accountName: B) {
  console.log(accountName + ":");
  console.log(JSON.stringify(account, null, 2));
}
