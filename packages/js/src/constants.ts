import * as anchor from "@coral-xyz/anchor";

export const SCALE_FACTOR_BASE = 1_000_000_000n;
export const SCALE_FACTOR_BASE_BN = new anchor.BN(1_000_000_000);
export const U64_MAX = 18446744073709551615n;
export const DAY_IN_SECONDS = 24 * 60 * 60;
export const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;
export const STAKE_DEPOSIT_RECEIPT_DISCRIMINATOR = [
  210, 98, 254, 196, 151, 68, 235, 0,
];
export const ESCAPE_HATCH_ENABLED = 1;

export const DEPOSITS_DISABLED = 4;
export const DEPOSIT_IGNORES_LP = 8;
export const WITHDRAW_IGNORES_LP = 16;

export const ALR_STAKING_PROGRAM_ID = new anchor.web3.PublicKey(
  "ALRPAsu4Aqmb8VCVcnjFQo5XF2K8MCDGmTECvZw4YJVY"
);

export const ALR_MINT = new anchor.web3.PublicKey(
  "3wVFzM26EBX3SoPYDd6HCxrBrqQ8Nr8jeAerr1xVn4f4"
);
export const REWARD_MINT = new anchor.web3.PublicKey(
  "3wVFzM26EBX3SoPYDd6HCxrBrqQ8Nr8jeAerr1xVn4f4"
);
// TODO: Use the admin key from the Alris Staking program
export const ADMIN_PUBLIC_KEY = new anchor.web3.PublicKey(
  "Gtv1Q4FpUtho5L4ZTDZWSUN4dyVVLgB5FFizip7zo8F3"
);
/**
 * @deprecated
 * Use `ALR_STAKING_PROGRAM_ID` instead
 */
export const SPL_STAKING_PROGRAM_DEVNET_ID = ALR_STAKING_PROGRAM_ID;
