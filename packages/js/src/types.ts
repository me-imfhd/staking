import { IdlAccounts, web3 } from "@coral-xyz/anchor";
import { AlrisStaking } from "./idl";

export type StakePool = IdlAccounts<AlrisStaking>["stakePool"];
export type StakeDepositReceipt =
  IdlAccounts<AlrisStaking>["stakeDepositReceipt"];
export type StakeDepositReceiptData = StakeDepositReceipt & {
  address: web3.PublicKey;
};
