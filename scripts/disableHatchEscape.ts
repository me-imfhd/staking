import { AlrisStakingProgram, StakePoolFlags } from "@alris-labs/token-staking";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
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
  let flags = await program.getFlags();
  console.log(
    "Original flags (binary):",
    flags.flag.toString(2).padStart(8, "0")
  );
  const result = await program.setFlag(
    StakePoolFlags.ESCAPE_HATCH_ENABLED,
    false
  );
  console.log(result);
  console.log("New flags (binary):", result.flag.toString(2).padStart(8, "0"));
}

initializeProgram()
  .then(() => {
    console.log("Disable hatch escape completed");
  })
  .catch((error) => {
    console.error(error);
  });
