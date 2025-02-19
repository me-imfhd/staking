import { IdlAccounts, web3 } from "@coral-xyz/anchor";
import { AlrisStaking } from "./idl";

export type StakePool = IdlAccounts<AlrisStaking>["StakePool"];
export type StakeDepositReceipt =
  IdlAccounts<AlrisStaking>["StakeDepositReceipt"];
export type StakeDepositReceiptData = StakeDepositReceipt & {
  address: web3.PublicKey;
};
