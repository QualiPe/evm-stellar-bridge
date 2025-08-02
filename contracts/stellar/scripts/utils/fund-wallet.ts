import { Address } from "@stellar/stellar-sdk";

export const fundWallet = async (wallet: Address): Promise<void> => {
  await fetch(`https://friendbot.stellar.org?addr=${wallet}`);
};