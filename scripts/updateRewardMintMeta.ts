// Import necessary libraries
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

import fs from "fs";
// Load keypair from JSON file
function loadKeypairFromFile(filePath: string) {
  const keypairData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Main function to deploy mint and set authority
async function updateRewardMintMeta() {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));
  const wallet = loadKeypairFromFile(
    `${process.env.HOME}/.config/solana/id.json`
  );

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const rewardMint = loadKeypairFromFile(
    `../target/deploy/r_alr_mint_keypair.json`
  );

  const metadataData = {
    name: "Alris Reward Token",
    symbol: "rALR",
    // Arweave / IPFS / Pinata etc link using metaplex standard for offchain data
    uri: "https://i.imgur.com/zw3Lrlh.jpeg",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  const metadataPDAAndBump = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      rewardMint.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const metadataPDA = metadataPDAAndBump[0];

  const transaction = new Transaction();

  const createMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: rewardMint.publicKey,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          collectionDetails: null,
          data: metadataData,
          isMutable: true,
        },
      }
    );

  transaction.add(createMetadataAccountInstruction);

  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet]
  );

  console.log("Transaction signature:", transactionSignature);
}

// Execute the main function with improved error handling
updateRewardMintMeta()
  .then(() => console.log("Reward mint metadata updated successfully."))
  .catch((error) => {
    console.error(
      "An error occurred during reward mint metadata update:",
      error
    );
    // Additional error handling logic can be added here
  });
