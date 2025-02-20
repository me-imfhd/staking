import { AlrisStakingProgram, MAX_DURATION, MIN_DURATION, MAX_WEIGHT } from "@alris-labs/token-staking"
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor"
import { Connection, Keypair } from '@solana/web3.js'
import fs from 'fs';
// Load keypair from JSON file
function loadKeypairFromFile(filePath: string) {
    const keypairData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function initializeProgram() {
    let kp = loadKeypairFromFile(process.env.HOME + '/.config/solana/id.json');
    let wallet = new Wallet(kp);

    let provider = new AnchorProvider(
        new Connection('https://api.devnet.solana.com', 'confirmed'),
        wallet,
        {commitment: 'confirmed'}
    )
    const program = new AlrisStakingProgram(provider);
    const receipts = await program.getStakeDepositReceipt();
    console.log(`Total receipts: ${receipts.length}`);
    console.log(receipts);
}

initializeProgram().then(() => {
    console.log("Deposits fetched");
}).catch((error) => {
    console.error(error);
});