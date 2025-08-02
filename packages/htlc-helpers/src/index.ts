import { Client, Keypair, Networks } from "@QualiPe/htlc-contract";
import { Asset, BASE_FEE, Networks as StellarNetworks, Operation, rpc, TransactionBuilder, Account } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import crypto from "crypto";

export interface CreateClientOptions {
  networkPassphrase: StellarNetworks;
  rpcUrl: string;
  contractId: string;
  signerKeypair: Keypair;
}

export class HTLCClient {
  private client: Client;
  private server: rpc.Server;
  private signerKeypair: Keypair;
  private networkPassphrase: StellarNetworks;

  constructor(options: CreateClientOptions) {
    this.signerKeypair = options.signerKeypair;
    this.networkPassphrase = options.networkPassphrase;
    this.server = new rpc.Server(options.rpcUrl);
    
    const { signTransaction } = basicNodeSigner(options.signerKeypair, options.networkPassphrase);
    
    this.client = new Client({
      networkPassphrase: options.networkPassphrase,
      contractId: options.contractId,
      rpcUrl: options.rpcUrl,
      signTransaction,
      publicKey: options.signerKeypair.publicKey(),
    });
  }

  // Getter methods for accessing the client and server
  getClient(): Client {
    return this.client;
  }

  getServer(): rpc.Server {
    return this.server;
  }

  getSignerKeypair(): Keypair {
    return this.signerKeypair;
  }

  getNetworkPassphrase(): StellarNetworks {
    return this.networkPassphrase;
  }

  // HTLC Operations
  async createSwap(
    sender: string,
    recipient: string,
    tokenId: string,
    amount: bigint,
    timelockHours: number = 10
  ) {
    const swapId = crypto.randomBytes(32);
    const secret = "secret123";
    const hashedSecret = crypto.createHash("sha256").update(secret).digest("hex");
    const timestamp = Math.floor(Date.now() / 1000);

    console.log("Creating swap with token_id:", tokenId);
    const swap = await this.client.create_swap({
      swap_id: swapId,
      sender: sender,
      recipient: recipient,
      token: tokenId,
      amount: amount,
      hashlock: Buffer.from(hashedSecret, "hex"),
      timelock: BigInt(timestamp + 60 * 60 * timelockHours),
    });

    const result = await swap.signAndSend();
    console.log("Swap created successfully:", result.result);
    
    return { swap, result, secret, hashedSecret, swapId };
  }

  async withdraw(swapId: Buffer, recipient: string, preimage: Buffer) {
    console.log("Withdrawing swap with swap_id:", swapId.toString("hex"));
    const withdrawResult = await this.client.withdraw({
      swap_id: swapId,
      recipient: recipient,
      preimage: preimage,
    });

    const result = await withdrawResult.signAndSend();
    console.log("Withdraw successful:", result.result);
    
    return { withdrawResult, result };
  }

  async refund(swapId: Buffer, sender: string) {
    console.log("Refunding swap with swap_id:", swapId.toString("hex"));
    const refundResult = await this.client.refund({
      swap_id: swapId,
      sender: sender,
    });

    const result = await refundResult.signAndSend();
    console.log("Refund successful:", result.result);
    
    return { refundResult, result };
  }

  async getSwap(swapId: Buffer) {
    console.log("Getting swap details for swap_id:", swapId.toString("hex"));
    const swap = await this.client.get_swap({
      swap_id: swapId,
    });

    console.log("Swap details retrieved:", swap.result);
    return swap.result;
  }

  async verifyPreimage(swapId: Buffer, preimage: Buffer) {
    console.log("Verifying preimage for swap_id:", swapId.toString("hex"));
    const verification = await this.client.verify_preimage({
      swap_id: swapId,
      preimage: preimage,
    });

    console.log("Preimage verification result:", verification.result);
    return verification.result;
  }

  async swapExists(swapId: Buffer) {
    console.log("Checking if swap exists for swap_id:", swapId.toString("hex"));
    const exists = await this.client.swap_exists({
      swap_id: swapId,
    });

    console.log("Swap exists:", exists.result);
    return exists.result;
  }

  // Stellar Operations
  async createTrustline(account: Account, asset: Asset) {
    const trustline = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(Operation.changeTrust({
      asset: asset,
    }))
    .setTimeout(30)
    .build();

    trustline.sign(this.signerKeypair);
    const sendTxResponse = await this.server.sendTransaction(trustline);
    console.log("Trustline transaction submitted:", sendTxResponse);

    // Wait for trustline transaction to be confirmed
    await this.waitForTransaction(sendTxResponse.hash, "trustline transaction");

    return sendTxResponse;
  }

  async sendPayment(
    senderAccount: Account,
    asset: Asset,
    amount: string,
    destination: string
  ) {
    const payment = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(Operation.payment({
      asset: asset,
      amount: amount,
      destination: destination,
    }))
    .setTimeout(30)
    .build();

    payment.sign(this.signerKeypair);
    const paymentResponse = await this.server.sendTransaction(payment);
    console.log("Payment transaction submitted:", paymentResponse);

    // Wait for payment transaction to be confirmed
    await this.waitForTransaction(paymentResponse.hash, "payment transaction");

    return paymentResponse;
  }

  async waitForTransaction(
    transactionHash: string,
    transactionType: string = "transaction"
  ) {
    if (transactionHash) {
      let getResponse = await this.server.getTransaction(transactionHash);
      while (getResponse.status === "NOT_FOUND") {
        console.log(`Waiting for ${transactionType} confirmation...`);
        getResponse = await this.server.getTransaction(transactionHash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (getResponse.status === "SUCCESS") {
        console.log(`${transactionType} successful`);
      } else {
        throw `${transactionType} failed: ${getResponse.resultXdr}`;
      }
      return getResponse;
    }
    return null;
  }

  // Utility method to create assets
  createAsset(assetCode: string, assetIssuer: string) {
    return new Asset(assetCode, assetIssuer);
  }
}

// Backward compatibility functions
export const createClient = ({ signerKeypair, rpcUrl, contractId, networkPassphrase }: CreateClientOptions) => {
  const { signTransaction } = basicNodeSigner(signerKeypair, networkPassphrase);
  
  return new Client({
    networkPassphrase,
    contractId,
    rpcUrl,
    signTransaction, 
    publicKey: signerKeypair.publicKey(),
  });
};

export const createServer = (rpcUrl: string) => {
  return new rpc.Server(rpcUrl);
};

export const waitForTransaction = async (
  server: rpc.Server,
  transactionHash: string,
  transactionType: string = "transaction"
) => {
  if (transactionHash) {
    let getResponse = await server.getTransaction(transactionHash);
    while (getResponse.status === "NOT_FOUND") {
      console.log(`Waiting for ${transactionType} confirmation...`);
      getResponse = await server.getTransaction(transactionHash);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (getResponse.status === "SUCCESS") {
      console.log(`${transactionType} successful`);
    } else {
      throw `${transactionType} failed: ${getResponse.resultXdr}`;
    }
    return getResponse;
  }
  return null;
};

export const createTrustline = async (
  server: rpc.Server,
  keypair: Keypair,
  account: Account,
  asset: Asset,
  networkPassphrase: StellarNetworks
) => {
  const trustline = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
  .addOperation(Operation.changeTrust({
    asset: asset,
  }))
  .setTimeout(30)
  .build();

  trustline.sign(keypair);
  const sendTxResponse = await server.sendTransaction(trustline);
  console.log("Trustline transaction submitted:", sendTxResponse);

  // Wait for trustline transaction to be confirmed
  await waitForTransaction(server, sendTxResponse.hash, "trustline transaction");

  return sendTxResponse;
};

export const sendPayment = async (
  server: rpc.Server,
  senderKeypair: Keypair,
  senderAccount: Account,
  asset: Asset,
  amount: string,
  destination: string,
  networkPassphrase: StellarNetworks
) => {
  const payment = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
  .addOperation(Operation.payment({
    asset: asset,
    amount: amount,
    destination: destination,
  }))
  .setTimeout(30)
  .build();

  payment.sign(senderKeypair);
  const paymentResponse = await server.sendTransaction(payment);
  console.log("Payment transaction submitted:", paymentResponse);

  // Wait for payment transaction to be confirmed
  await waitForTransaction(server, paymentResponse.hash, "payment transaction");

  return paymentResponse;
};

export const createSwap = async (
  client: Client,
  sender: string,
  recipient: string,
  tokenId: string,
  amount: bigint,
  timelockHours: number = 10
) => {
  const swapId = crypto.randomBytes(32);
  const secret = "secret123";
  const hashedSecret = crypto.createHash("sha256").update(secret).digest("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  console.log("Creating swap with token_id:", tokenId);
  const swap = await client.create_swap({
    swap_id: swapId,
    sender: sender,
    recipient: recipient,
    token: tokenId,
    amount: amount,
    hashlock: Buffer.from(hashedSecret, "hex"),
    timelock: BigInt(timestamp + 60 * 60 * timelockHours),
  });

  const result = await swap.signAndSend();
  console.log("Swap created successfully:", result.result);
  
  return { swap, result, secret, hashedSecret };
};

export const createAsset = (assetCode: string, assetIssuer: string) => {
  return new Asset(assetCode, assetIssuer);
};

export const withdraw = async (
  client: Client,
  swapId: Buffer,
  recipient: string,
  preimage: Buffer
) => {
  console.log("Withdrawing swap with swap_id:", swapId.toString("hex"));
  const withdrawResult = await client.withdraw({
    swap_id: swapId,
    recipient: recipient,
    preimage: preimage,
  });

  const result = await withdrawResult.signAndSend();
  console.log("Withdraw successful:", result.result);
  
  return { withdrawResult, result };
};

export const refund = async (
  client: Client,
  swapId: Buffer,
  sender: string
) => {
  console.log("Refunding swap with swap_id:", swapId.toString("hex"));
  const refundResult = await client.refund({
    swap_id: swapId,
    sender: sender,
  });

  const result = await refundResult.signAndSend();
  console.log("Refund successful:", result.result);
  
  return { refundResult, result };
};

export const getSwap = async (
  client: Client,
  swapId: Buffer
) => {
  console.log("Getting swap details for swap_id:", swapId.toString("hex"));
  const swap = await client.get_swap({
    swap_id: swapId,
  });

  console.log("Swap details retrieved:", swap.result);
  return swap.result;
};

export const verifyPreimage = async (
  client: Client,
  swapId: Buffer,
  preimage: Buffer
) => {
  console.log("Verifying preimage for swap_id:", swapId.toString("hex"));
  const verification = await client.verify_preimage({
    swap_id: swapId,
    preimage: preimage,
  });

  console.log("Preimage verification result:", verification.result);
  return verification.result;
};

export const swapExists = async (
  client: Client,
  swapId: Buffer
) => {
  console.log("Checking if swap exists for swap_id:", swapId.toString("hex"));
  const exists = await client.swap_exists({
    swap_id: swapId,
  });

  console.log("Swap exists:", exists.result);
  return exists.result;
};