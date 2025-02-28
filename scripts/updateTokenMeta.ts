import { AlrisStakingProgram } from "@alris-labs/token-staking";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
// Load keypair from JSON file
function loadKeypairFromFile(filePath: string) {
  const keypairData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function updateTokenMeta() {
  let kp = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");
  let wallet = new Wallet(kp);

  let provider = new AnchorProvider(
    new Connection("https://api.mainnet-beta.solana.com", "confirmed"),
    wallet,
    { commitment: "confirmed" }
  );
  const program = new AlrisStakingProgram(provider);
  const tx = await program.updateTokenMetadata(
    "Alris LP",
    "LALR",
    "https://alris.com/alr-lp.jpg"
  );
  console.log(tx);
  const meta = await program.getTokenMetadata();
  console.log(meta);
}

updateTokenMeta()
  .then(() => {
    console.log("Update token meta completed");
  })
  .catch((error) => {
    console.error(error);
  });
