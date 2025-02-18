import {
  AnchorProvider,
  BN,
  IdlAccounts,
  setProvider,
  Wallet,
  workspace,
  utils,
} from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import { Program, web3 } from "@coral-xyz/anchor";
import { AlrisStaking } from "../target/types/alris_staking";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

export class AlrisStakingProgram {
  private static instance: AlrisStakingProgram;
  private _programId: web3.PublicKey | null = null;
  private _program: Program<AlrisStaking> | null = null;
  private _wallet: Wallet | null = null;
  private _admin: web3.Keypair | null = null;
  alrMint: web3.PublicKey = new web3.PublicKey(
    "3wVFzM26EBX3SoPYDd6HCxrBrqQ8Nr8jeAerr1xVn4f4"
  );
  rewardMint: web3.PublicKey = new web3.PublicKey(
    "3wVFzM26EBX3SoPYDd6HCxrBrqQ8Nr8jeAerr1xVn4f4"
  );
  private constructor() {}
  static getInstance(): AlrisStakingProgram {
    if (!AlrisStakingProgram.instance) {
      AlrisStakingProgram.instance = new AlrisStakingProgram();
    }
    return AlrisStakingProgram.instance;
  }
  private initializeProgram(): void {
    if (!this._program) {
      let provider = AnchorProvider.env();
      setProvider(provider);
      const program = workspace.AlrisStaking as Program<AlrisStaking>;
      const wallet = provider.wallet as Wallet;
      const admin = AlrisStakingProgram.getAdminKeypair();
      this._wallet = wallet;
      this._program = program;
      this._admin = admin;
      this._programId = program.programId;
    }
  }
  get alrMintKeyPair(): web3.Keypair {
    const test_mint = path.join(__dirname, "..", "test_mint.json");
    const jsonContent = fs.readFileSync(test_mint, "utf8");
    const keypair = JSON.parse(jsonContent);
    const secretKey = Uint8Array.from(keypair);
    return web3.Keypair.fromSecretKey(secretKey);
  }
  static getAdminKeypair(): web3.Keypair {
    const adminJsonPath = path.join(__dirname, "..", "admin.json");
    const adminJsonContent = fs.readFileSync(adminJsonPath, "utf8");
    const adminKeypairData = JSON.parse(adminJsonContent);
    const secretKey = Uint8Array.from(adminKeypairData);
    return web3.Keypair.fromSecretKey(secretKey);
  }
  get programId(): web3.PublicKey {
    if (!this._programId) {
      this.initializeProgram();
    }
    return this._programId;
  }
  get program(): Program<AlrisStaking> {
    if (!this._program) {
      this.initializeProgram();
    }
    return this._program!;
  }
  get wallet(): Wallet {
    if (!this._program || !this._wallet) {
      this.initializeProgram();
    }
    return this._wallet;
  }
  get admin(): web3.Keypair {
    if (!this._program || !this._admin) {
      this.initializeProgram();
    }
    return this._admin;
  }
  get stakePoolPda(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [
        new BN(1).toArrayLike(Buffer, "le", 1),
        this.alrMint.toBuffer(),
        this.admin.publicKey.toBuffer(),
        Buffer.from("stakePool"),
      ],
      this.programId
    )[0];
  }
  get vaultPda(): web3.PublicKey {
    const stakePoolKey = this.stakePoolPda;
    return web3.PublicKey.findProgramAddressSync(
      [stakePoolKey.toBuffer(), Buffer.from("vault", "utf-8")],
      this.programId
    )[0];
  }
  get rewardVaultPda(): web3.PublicKey {
    const stakePoolKey = this.stakePoolPda;
    return web3.PublicKey.findProgramAddressSync(
      [
        stakePoolKey.toBuffer(),
        this.rewardMint.toBuffer(),
        Buffer.from("rewardVault", "utf-8"),
      ],
      this.programId
    )[0];
  }
  get stakeMint(): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [this.stakePoolPda.toBuffer(), Buffer.from("stakeMint", "utf-8")],
      this.programId
    )[0];
  }
  async initialize(
    maxWeight: BN,
    minDuration: BN,
    maxDuration: BN
  ): Promise<IdlAccounts<AlrisStaking>["stakePool"]> {
    let intialize_stake_pool_ix = await this.program.methods
      .initializeStakePool(1, maxWeight, minDuration, maxDuration)
      .accounts({
        authority: this.admin.publicKey,
        mint: this.alrMint,
        stakePool: this.stakePoolPda,
        stakeMint: this.stakeMint,
        vault: this.vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        payer: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    let add_reward_pool_ix = await this.program.methods
      .addRewardPool(0)
      .accounts({
        rewardMint: this.rewardMint,
        rewardVault: this.rewardVaultPda,
        authority: this.admin.publicKey,
        stakePool: this.stakePoolPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        payer: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    let flags_ix = await this.program.methods
      .setFlags(0b0000_0000)
      .accounts({
        authority: this.admin.publicKey,
        stakePool: this.stakePoolPda,
      })
      .instruction();
    const tx = new web3.Transaction().add(
      intialize_stake_pool_ix,
      add_reward_pool_ix,
      flags_ix
    );
    let tx_hash = await this.program.provider.sendAndConfirm(tx, [
      this.wallet.payer,
      this.admin,
    ]);
    console.log("tx_hash", tx_hash);
    return this.program.account.stakePool.fetch(this.stakePoolPda);
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
      this.programId
    )[0];
  }
  async getOrCreateAta(mint: web3.PublicKey, owner: web3.PublicKey) {
    const userAta = await getOrCreateAssociatedTokenAccount(
      this.program.provider.connection,
      this.wallet.payer,
      mint,
      owner
    );
    return userAta.address;
  }
  async addFundsToRewardVault(amount: number) {
    await mintTo(
      this.program.provider.connection,
      this.wallet.payer,
      this.rewardMint,
      this.rewardVaultPda,
      this.admin.publicKey,
      amount,
      [this.admin]
    );
  }
  async deposit(
    nonce: number,
    amount: BN,
    lockupDuration: BN,
    userKeypair: web3.Keypair
  ): Promise<{
    stakeDepositReceipt: IdlAccounts<AlrisStaking>["stakeDepositReceipt"];
    stakePool: IdlAccounts<AlrisStaking>["stakePool"];
  }> {
    const userALRMintTokenAccount = this.getAta(
      this.alrMint,
      userKeypair.publicKey
    );

    const userStakeMintTokenAccount = await this.getOrCreateAta(
      this.stakeMint,
      userKeypair.publicKey
    );

    const stakeDepositReceiptPda = this.getStakeDepositReceiptPda(
      nonce,
      userKeypair.publicKey,
      this.stakePoolPda
    );

    let tx = await this.program.methods
      .deposit(nonce, amount, lockupDuration)
      .accounts({
        stakePool: this.stakePoolPda,
        destination: userStakeMintTokenAccount,
        from: userALRMintTokenAccount,
        owner: userKeypair.publicKey,
        payer: userKeypair.publicKey,
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
      ])
      .signers([userKeypair])
      .rpc();
    console.log("tx_hash", tx);
    const stakeDepositReceipt =
      await this.program.account.stakeDepositReceipt.fetch(
        stakeDepositReceiptPda
      );
    const stakePool = await this.program.account.stakePool.fetch(
      this.stakePoolPda
    );
    return {
      stakeDepositReceipt,
      stakePool,
    };
  }
  displayAccount<
    B extends keyof IdlAccounts<AlrisStaking>,
    T extends IdlAccounts<AlrisStaking>[B]
  >(account: T, accountName: B) {
    console.log(accountName + ":");
    
    console.log(JSON.stringify(account, null, 2));
  }
}
