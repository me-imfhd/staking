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
  METADATA_PROGRAM_ID,
  REWARD_MINT,
} from "./constants";
import {
  StakeDepositReceipt,
  StakeDepositReceiptData,
  StakePool,
} from "./types";
import {
  deserializeMetadata,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";

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
  /**
   * Get the mint for the ALR token, the staking token
   * @returns The mint for the ALR token
   */
  get alrMint(): web3.PublicKey {
    return ALR_MINT;
  }
  /**
   * Get the mint for the reward token, the reward token
   * @returns The mint for the reward token
   */
  get rewardMint(): web3.PublicKey {
    return REWARD_MINT;
  }
  /**
   * Get the mint for the stake token, the lp token representing the staked ALR amounts
   * @returns The mint for the stake token
   */
  get stakeMint(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [this.stakePoolPda.toBuffer(), Buffer.from("stakeMint", "utf-8")],
      this.program.programId
    )[0];
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
  get userALRAta(): web3.PublicKey {
    return this.getAta(ALR_MINT, this.wallet);
  }
  get userRewardMintAta(): web3.PublicKey {
    return this.getAta(REWARD_MINT, this.wallet);
  }
  get userStakeMintAta(): web3.PublicKey {
    return this.getAta(this.stakeMint, this.wallet);
  }
  get metadataAccount(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        this.stakeMint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    )[0];
  }

  getAta(mint: web3.PublicKey, owner: web3.PublicKey): web3.PublicKey {
    return utils.token.associatedAddress({
      mint,
      owner,
    });
  }
  getStakeDepositReceiptPda(nonce: number): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [
        this.wallet.toBuffer(),
        this.stakePoolPda.toBuffer(),
        new BN(nonce).toArrayLike(Buffer, "le", 4),
        Buffer.from("stakeDepositReceipt", "utf-8"),
      ],
      this.program.programId
    )[0];
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

  async getRewardVaultBalance(): Promise<web3.TokenAmount> {
    const balance =
      await this.program.provider.connection.getTokenAccountBalance(
        this.rewardVaultPda
      );
    return balance.value;
  }
  async getTotalStakedInPool(): Promise<{
    totalWeightedStake: BN;
    stakedTokenAmount: web3.TokenAmount;
  }> {
    const stakePool = await this.getStakePool();
    const balance =
      await this.program.provider.connection.getTokenAccountBalance(
        this.vaultPda
      );

    return {
      totalWeightedStake: stakePool.totalWeightedStake,
      stakedTokenAmount: balance.value,
    };
  }
  async getUserALRBalance(): Promise<web3.TokenAmount> {
    const balance =
      await this.program.provider.connection.getTokenAccountBalance(
        this.userALRAta
      );
    return balance.value;
  }
  async getUserStakeBalance(): Promise<{
    stakeAmount: web3.TokenAmount;
  }> {
    const balance =
      await this.program.provider.connection.getTokenAccountBalance(
        this.userStakeMintAta
      );
    return {
      stakeAmount: balance.value,
    };
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
        const stakeReceiptKey = this.getStakeDepositReceiptPda(i);
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
  async getStakeDepositReceipt(): Promise<StakeDepositReceiptData[]> {
    let receipts = await this.program.account.stakeDepositReceipt.all([
      {
        memcmp: {
          offset: 8,
          bytes: this.wallet.toBase58(),
          encoding: "base58",
        },
      },
    ]);
    return receipts.map((r) => {
      let receipt = r.account;
      return {
        ...receipt,
        address: r.publicKey,
      };
    });
  }
  /**
   * ADMIN ONLY
   * Initialize the stake pool
   * @param maxWeight The maximum weight of the stake pool
   * @param minDuration The minimum duration of the stake pool
   * @param maxDuration The maximum duration of the stake pool
   * @returns The transaction hash
   */
  async initialize(
    maxWeight: BN,
    minDuration: BN,
    maxDuration: BN
  ): Promise<{
    stakePool: StakePool;
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
  async deposit(
    amount: BN,
    lockupDuration: BN
  ): Promise<{
    tx_hash: string;
    stakeDepositReceipt: StakeDepositReceipt;
    stakePool: StakePool;
  }> {
    const userALRMintTokenAccount = this.getAta(ALR_MINT, this.wallet);

    const {
      ata: userStakeMintTokenAccount,
      instruction: userStakeMintTokenAccountInstruction,
    } = await this.getOrCreateTokenAccountInstruction(this.stakeMint);

    const nonce = await this.getNextUnusedStakeReceiptNonce(this.wallet);

    const stakeDepositReceiptPda = this.getStakeDepositReceiptPda(nonce);
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
  async withdraw(stakeDepositReceipt: web3.PublicKey): Promise<{
    tx_hash: string;
  }> {
    const tx = await this.program.methods
      .withdraw()
      .accounts({
        claimBase: {
          owner: this.wallet,
          stakeDepositReceipt,
          stakePool: this.stakePoolPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        stakeMint: this.stakeMint,
        vault: this.vaultPda,
        destination: this.getAta(ALR_MINT, this.wallet),
        from: this.getAta(this.stakeMint, this.wallet),
      })
      .remainingAccounts([
        {
          isSigner: false,
          isWritable: true,
          pubkey: this.rewardVaultPda,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: this.userRewardMintAta,
        },
      ])
      .rpc();
    return {
      tx_hash: tx,
    };
  }
  async claimRewards(stakeDepositReceipt: web3.PublicKey): Promise<{
    tx_hash: string;
    stakeDepositReceipt: StakeDepositReceipt;
  }> {
    const tx = await this.program.methods
      .claimAll()
      .accounts({
        claimBase: {
          owner: this.wallet,
          stakePool: this.stakePoolPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          stakeDepositReceipt,
        },
      })
      .remainingAccounts([
        {
          isSigner: false,
          isWritable: true,
          pubkey: this.rewardVaultPda,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: this.userRewardMintAta,
        },
      ])
      .rpc();
    const stakeDepositReceiptData =
      await this.program.account.stakeDepositReceipt.fetch(stakeDepositReceipt);
    return {
      tx_hash: tx,
      stakeDepositReceipt: stakeDepositReceiptData,
    };
  }
  /**
   * ADMIN ONLY
   * Transfer the authority of the stake pool to a new authority
   * @param newAuthority The new authority of the stake pool
   * @returns The transaction hash
   */
  async transferAuthority(newAuthority: web3.PublicKey): Promise<string> {
    const tx = await this.program.methods
      .transferAuthority()
      .accounts({
        authority: ADMIN_PUBLIC_KEY,
        stakePool: this.stakePoolPda,
        newAuthority,
      })
      .rpc();
    return tx;
  }

  /**
   * ADMIN ONLY
   * Update a specific flag for the stake pool
   * @param flag The StakePoolFlag to modify
   * @param enable Whether to enable or disable the flag
   * @returns The transaction hash
   */
  async setFlag(
    flag: StakePoolFlags,
    enable: boolean
  ): Promise<{ tx: string; flag: number; flags: { [key: string]: boolean } }> {
    // Get current flags
    const pool = await this.getStakePool();
    let newFlags = pool.flags;

    if (enable) {
      // Set the bit using OR
      newFlags |= flag;
    } else {
      // Clear the bit using AND with inverted mask
      newFlags &= ~flag;
    }

    const tx = await this.program.methods
      .setFlags(newFlags)
      .accounts({
        authority: ADMIN_PUBLIC_KEY,
        stakePool: this.stakePoolPda,
      })
      .rpc();

    // Return status of all flags
    return {
      tx,
      flag: newFlags,
      flags: {
        ESCAPE_HATCH_ENABLED:
          (newFlags & StakePoolFlags.ESCAPE_HATCH_ENABLED) !== 0,
        DISABLE_DEPOSITS: (newFlags & StakePoolFlags.DISABLE_DEPOSITS) !== 0,
        DEPOSIT_IGNORES_LP:
          (newFlags & StakePoolFlags.DEPOSIT_IGNORES_LP) !== 0,
        WITHDRAW_IGNORES_LP:
          (newFlags & StakePoolFlags.WITHDRAW_IGNORES_LP) !== 0,
      },
    };
  }
  /**
   * ADMIN ONLY
   * Get the current flags for the stake pool
   * @returns The current flags
   */
  async getFlags(): Promise<{
    flag: number;
    flags: { [key: string]: boolean };
  }> {
    const pool = await this.getStakePool();
    return {
      flag: pool.flags,
      flags: {
        ESCAPE_HATCH_ENABLED:
          (pool.flags & StakePoolFlags.ESCAPE_HATCH_ENABLED) !== 0,
        DISABLE_DEPOSITS: (pool.flags & StakePoolFlags.DISABLE_DEPOSITS) !== 0,
        DEPOSIT_IGNORES_LP:
          (pool.flags & StakePoolFlags.DEPOSIT_IGNORES_LP) !== 0,
        WITHDRAW_IGNORES_LP:
          (pool.flags & StakePoolFlags.WITHDRAW_IGNORES_LP) !== 0,
      },
    };
  }

  /**
   * ADMIN ONLY
   * Set the max weight for the stake pool
   * @param maxWeight The maximum weight of the stake pool
   * @returns The transaction hash
   */
  async updateTokenMetadata(
    name: string,
    symbol: string,
    uri: string
  ): Promise<string> {
    const tx = await this.program.methods
      .updateTokenMeta(name, symbol, uri)
      .accounts({
        authority: ADMIN_PUBLIC_KEY,
        stakeMint: this.stakeMint,
        metadataAccount: this.metadataAccount,
        metadataProgram: METADATA_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        stakePool: this.stakePoolPda,
      })
      .rpc();
    return tx;
  }
  async getTokenMetadata(): Promise<Metadata> {
    const metadataAccount =
      await this.program.provider.connection.getAccountInfo(
        this.metadataAccount
      );

    let metadata = deserializeMetadata({
      data: metadataAccount.data,
      executable: metadataAccount.executable,
      // @ts-ignore
      publicKey: this.metadataAccount,
      // @ts-ignore
      owner: metadataAccount.owner,
      lamports: {
        basisPoints: BigInt(metadataAccount.lamports),
        identifier: "SOL",
        decimals: 9,
      },
      rentEpoch: BigInt(metadataAccount.rentEpoch),
    });
    return metadata;
  }
}
export function displayAccount<
  B extends keyof IdlAccounts<AlrisStaking>,
  T extends IdlAccounts<AlrisStaking>[B]
>(account: T, accountName: B) {
  console.log(accountName + ":");
  console.log(JSON.stringify(account, null, 2));
}

/**
 * Flags that can be set on the stake pool
 */
export enum StakePoolFlags {
  ESCAPE_HATCH_ENABLED = 1,
  DISABLE_DEPOSITS = 4,
  DEPOSIT_IGNORES_LP = 8,
  WITHDRAW_IGNORES_LP = 16,
}
