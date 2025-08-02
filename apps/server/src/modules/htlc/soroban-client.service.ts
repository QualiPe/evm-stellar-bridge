import { Injectable, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';
import {
  Client as HTLCClient,
  HTLCSwap as ContractHTLCSwap,
} from '@QualiPe/htlc-contract';
import { Keypair } from '@stellar/stellar-sdk';
import { basicNodeSigner } from '@stellar/stellar-sdk/lib/contract';

export interface SorobanConfig {
  rpcUrl: string;
  network: string;
  contractId: string;
  secretKey?: string;
}

export interface HTLCSwap {
  sender: string;
  recipient: string;
  token: string;
  amount: bigint;
  hashlock: string;
  timelock: bigint;
  preimage?: string;
  isWithdrawn: boolean;
  isRefunded: boolean;
}

export interface CreateSwapParams {
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: bigint;
  hashlock: string;
  timelock: bigint;
}

@Injectable()
export class SorobanClientService {
  private readonly logger = new Logger(SorobanClientService.name);
  private config: SorobanConfig;
  private htlcClient?: HTLCClient;
  private keypair?: Keypair;

  constructor() {
    this.initializeSorobanClient();
  }

  private initializeSorobanClient() {
    try {
      const rpcUrl =
        process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
      const contractAddress = process.env.STELLAR_HTLC_CONTRACT_ADDRESS;
      const network = process.env.STELLAR_NETWORK || 'testnet';
      const secretKey = process.env.STELLAR_SECRET_KEY;

      if (!contractAddress) {
        throw new Error('STELLAR_HTLC_CONTRACT_ADDRESS not configured');
      }

      this.config = {
        rpcUrl,
        network,
        contractId: contractAddress,
        secretKey,
      };

      // Initialize keypair if secret key is provided
      if (secretKey) {
        this.keypair = Keypair.fromSecret(secretKey);
        this.logger.log(`Keypair initialized for: ${this.keypair.publicKey()}`);
      }

      // Initialize HTLC client
      const networkPassphrase = this.getNetworkPassphrase();
      const { signTransaction } = basicNodeSigner(
        this.keypair || Keypair.random(),
        networkPassphrase,
      );

      this.htlcClient = new HTLCClient({
        networkPassphrase,
        contractId: contractAddress,
        rpcUrl,
        signTransaction,
        publicKey: this.keypair?.publicKey() || '',
      });

      this.logger.log(
        `Soroban client initialized with contract: ${this.config.contractId}`,
      );
      this.logger.log(
        `Network: ${this.config.network}, RPC: ${this.config.rpcUrl}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Soroban client:', error);
      throw error;
    }
  }

  /**
   * Create a new HTLC swap on Soroban
   */
  async createSwap(params: CreateSwapParams): Promise<void> {
    this.logger.log(`Creating Soroban HTLC swap: ${params.swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(params.swapId);
      const hashlockBuffer = this.stringToBuffer(params.hashlock);

      const tx = await this.htlcClient.create_swap(
        {
          swap_id: swapIdBuffer,
          sender: params.sender,
          recipient: params.recipient,
          token: params.token,
          amount: BigInt(params.amount),
          hashlock: hashlockBuffer,
          timelock: BigInt(params.timelock),
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      if (!tx) {
        throw new Error('Transaction failed');
      }

      const result = await tx.signAndSend();
      this.logger.log(`Soroban HTLC swap created: ${params.swapId}`);
      this.logger.log(`Transaction result:`, result);
    } catch (error) {
      this.logger.error(`Error creating Soroban HTLC swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Withdraw from HTLC using preimage
   */
  async withdraw(
    swapId: string,
    recipient: string,
    preimage: string,
  ): Promise<void> {
    this.logger.log(`Withdrawing from Soroban HTLC swap: ${swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(swapId);
      const preimageBuffer = this.stringToBuffer(preimage);

      const tx = await this.htlcClient.withdraw(
        {
          swap_id: swapIdBuffer,
          recipient: recipient,
          preimage: preimageBuffer,
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      const result = await tx.signAndSend();
      this.logger.log(`Soroban HTLC swap withdrawn: ${swapId}`);
      this.logger.log(`Transaction result:`, result);
    } catch (error) {
      this.logger.error(
        `Error withdrawing from Soroban HTLC swap: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Refund HTLC after timelock expires
   */
  async refund(swapId: string, sender: string): Promise<void> {
    this.logger.log(`Refunding Soroban HTLC swap: ${swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(swapId);

      const tx = await this.htlcClient.refund(
        {
          swap_id: swapIdBuffer,
          sender: sender,
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      const result = await tx.signAndSend();
      this.logger.log(`Soroban HTLC swap refunded: ${swapId}`);
      this.logger.log(`Transaction result:`, result);
    } catch (error) {
      this.logger.error(`Error refunding Soroban HTLC swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get HTLC details by swap ID
   */
  async getSwap(swapId: string): Promise<HTLCSwap | null> {
    this.logger.log(`Getting Soroban swap details for: ${swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(swapId);

      const tx = await this.htlcClient.get_swap(
        {
          swap_id: swapIdBuffer,
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      const result = await tx.simulate();

      if (!result.result || result.result.value === null) {
        this.logger.log(`Swap not found: ${swapId}`);
        return null;
      }

      const contractSwap: ContractHTLCSwap = result.result.value;

      const swap: HTLCSwap = {
        sender: contractSwap.sender,
        recipient: contractSwap.recipient,
        token: contractSwap.token,
        amount: contractSwap.amount,
        hashlock: this.bufferToString(contractSwap.hashlock),
        timelock: contractSwap.timelock,
        preimage: contractSwap.preimage
          ? this.bufferToString(contractSwap.preimage.value)
          : undefined,
        isWithdrawn: contractSwap.is_withdrawn,
        isRefunded: contractSwap.is_refunded,
      };

      this.logger.log(`Swap details retrieved:`, swap);
      return swap;
    } catch (error) {
      this.logger.error(`Error getting Soroban swap details: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify if a preimage is valid for a swap
   */
  async verifyPreimage(swapId: string, preimage: string): Promise<boolean> {
    this.logger.log(`Verifying preimage for Soroban swap: ${swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(swapId);
      const preimageBuffer = this.stringToBuffer(preimage);

      const tx = await this.htlcClient.verify_preimage(
        {
          swap_id: swapIdBuffer,
          preimage: preimageBuffer,
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      const result = await tx.simulate();
      const isValid = result.result;

      this.logger.log(`Preimage verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Error verifying preimage: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a swap exists
   */
  async swapExists(swapId: string): Promise<boolean> {
    this.logger.log(`Checking if Soroban swap exists: ${swapId}`);

    try {
      if (!this.htlcClient) {
        throw new Error('HTLC client not initialized');
      }

      const swapIdBuffer = this.stringToBuffer(swapId);

      const tx = await this.htlcClient.swap_exists(
        {
          swap_id: swapIdBuffer,
        },
        {
          timeoutInSeconds: 30,
          simulate: true,
        },
      );

      const result = await tx.simulate();
      const exists = result.result;

      this.logger.log(`Swap exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Error checking swap existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Convert string to Buffer for contract calls
   */
  private stringToBuffer(str: string): Buffer {
    if (str.startsWith('0x')) {
      return Buffer.from(str.slice(2), 'hex');
    }
    return Buffer.from(str, 'hex');
  }

  /**
   * Convert Buffer to string for responses
   */
  private bufferToString(buffer: Buffer): string {
    return '0x' + buffer.toString('hex');
  }

  /**
   * Get network passphrase based on configuration
   */
  private getNetworkPassphrase(): string {
    switch (this.config.network) {
      case 'testnet':
        return 'Test SDF Network ; September 2015';
      case 'public':
        return 'Public Global Stellar Network ; September 2015';
      default:
        return 'Test SDF Network ; September 2015';
    }
  }

  /**
   * Get HTLC client instance for direct access
   */
  getHTLCClient(): HTLCClient | undefined {
    return this.htlcClient;
  }

  /**
   * Get configuration
   */
  getConfig(): SorobanConfig {
    return this.config;
  }

  /**
   * Check if client is properly initialized
   */
  isInitialized(): boolean {
    return !!this.htlcClient;
  }
}
