// Import necessary libraries
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import fs from "fs";
import { ADMIN_PUBLIC_KEY } from "@alris-labs/token-staking";

// Load keypair from JSON file
function loadKeypairFromFile(filePath: string) {
  const keypairData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Main function to deploy mint and set authority
async function deployMintAndSetAuthority() {
  // Establish connection to the Solana cluster
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const wallet = loadKeypairFromFile(
    `${process.env.HOME}/.config/solana/id.json`
  );
  // Load the mint keypair from a JSON file
  const mintKeypair = loadKeypairFromFile(
    "../target/deploy/r_alr_mint_keypair.json"
  );
  const mint = await createMint(
    connection,
    wallet,
    ADMIN_PUBLIC_KEY,
    null,
    6,
    mintKeypair
  );
  console.log("Mint created with public key:", mint);
}

// Execute the main function with improved error handling
deployMintAndSetAuthority()
  .then(() =>
    console.log("Mint deployment and authority setting completed successfully.")
  )
  .catch((error) => {
    console.error(
      "An error occurred during mint deployment and authority setting:",
      error
    );
    // Additional error handling logic can be added here
  });
