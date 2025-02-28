import {
  AlrisStakingProgram,
  MAX_DURATION,
  MIN_DURATION,
  MAX_WEIGHT,
} from "@alris-labs/token-staking";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
// Load keypair from JSON file
function loadKeypairFromFile(filePath: string) {
  const keypairData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function initializeProgram() {
  let kp = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");
  let wallet = new Wallet(kp);

  let provider = new AnchorProvider(
    new Connection("https://api.mainnet-beta.solana.com", "confirmed"),
    wallet,
    { commitment: "confirmed" }
  );
  const program = new AlrisStakingProgram(provider);
  const deposit = await program.deposit(new BN(1_000_000), MIN_DURATION);
  console.log(deposit);
}

initializeProgram()
  .then(() => {
    console.log("Deposit completed");
  })
  .catch((error) => {
    console.error(error);
  });
