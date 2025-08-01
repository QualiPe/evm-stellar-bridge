import { Injectable, Logger } from '@nestjs/common';
import {
  SorobanClientService,
  CreateSwapParams,
} from './soroban-client.service';

export interface StellarSwapDetails {
  sender: string;
  recipient: string;
  token: string;
  amount: string; // Changed from bigint to string for JSON serialization
  hashlock: string;
  timelock: string; // Changed from bigint to string for JSON serialization
  preimage?: string;
  isWithdrawn: boolean;
  isRefunded: boolean;
}

export interface StellarFundParams {
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: bigint;
  hashlock: string;
  timelock: bigint;
}

@Injectable()
export class StellarHtlcService {
  private readonly logger = new Logger(StellarHtlcService.name);

  constructor(private readonly sorobanClient: SorobanClientService) {
    this.initializeStellarService();
  }

  private initializeStellarService() {
    try {
      const config = this.sorobanClient.getConfig();
      this.logger.log(
        `Stellar HTLC service initialized with contract: ${config.contractId}`,
      );
      this.logger.log(`Network: ${config.network}, RPC: ${config.rpcUrl}`);

      if (!this.sorobanClient.isInitialized()) {
        this.logger.warn('Soroban client not properly initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Stellar HTLC service:', error);
      this.logger.log('Falling back to simulation mode');
    }
  }

  /**
   * Create a new HTLC swap on Stellar
   */
  async createSwap(params: StellarFundParams): Promise<void> {
    this.logger.log(`Creating Stellar HTLC swap: ${params.swapId}`);

    try {
      const createParams: CreateSwapParams = {
        swapId: params.swapId,
        sender: params.sender,
        recipient: params.recipient,
        token: params.token,
        amount: params.amount,
        hashlock: params.hashlock,
        timelock: params.timelock,
      };

      await this.sorobanClient.createSwap(createParams);
      this.logger.log(`Stellar HTLC swap created: ${params.swapId}`);
    } catch (error) {
      this.logger.error(`Error creating Stellar HTLC swap: ${error.message}`);
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
    this.logger.log(`Withdrawing from Stellar HTLC swap: ${swapId}`);

    try {
      await this.sorobanClient.withdraw(swapId, recipient, preimage);
      this.logger.log(`Stellar HTLC swap withdrawn: ${swapId}`);
    } catch (error) {
      this.logger.error(
        `Error withdrawing from Stellar HTLC swap: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Refund HTLC after timelock expires
   */
  async refund(swapId: string, sender: string): Promise<void> {
    this.logger.log(`Refunding Stellar HTLC swap: ${swapId}`);

    try {
      await this.sorobanClient.refund(swapId, sender);
      this.logger.log(`Stellar HTLC swap refunded: ${swapId}`);
    } catch (error) {
      this.logger.error(`Error refunding Stellar HTLC swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get HTLC details by swap ID
   */
  async getSwap(swapId: string): Promise<StellarSwapDetails | null> {
    this.logger.log(`Getting Stellar swap details for: ${swapId}`);

    try {
      const swap = await this.sorobanClient.getSwap(swapId);
      if (!swap) {
        return null;
      }

      return {
        sender: swap.sender,
        recipient: swap.recipient,
        token: swap.token,
        amount: swap.amount.toString(), // Convert BigInt to string for JSON serialization
        hashlock: swap.hashlock,
        timelock: swap.timelock.toString(), // Convert BigInt to string for JSON serialization
        preimage: swap.preimage,
        isWithdrawn: swap.isWithdrawn,
        isRefunded: swap.isRefunded,
      };
    } catch (error) {
      this.logger.error(`Error getting Stellar swap details: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify if a preimage is valid for a swap
   */
  async verifyPreimage(swapId: string, preimage: string): Promise<boolean> {
    this.logger.log(`Verifying preimage for Stellar swap: ${swapId}`);

    try {
      return await this.sorobanClient.verifyPreimage(swapId, preimage);
    } catch (error) {
      this.logger.error(`Error verifying preimage: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a swap exists
   */
  async swapExists(swapId: string): Promise<boolean> {
    this.logger.log(`Checking if Stellar swap exists: ${swapId}`);

    try {
      return await this.sorobanClient.swapExists(swapId);
    } catch (error) {
      this.logger.error(`Error checking swap existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all swaps (for debugging)
   */
  getAllSwaps(): StellarSwapDetails[] {
    this.logger.log('Getting all Stellar swaps (simulated)');
    return []; // Simulated empty list - in production, this would query the contract
  }

  /**
   * Clear all swaps (for testing)
   */
  clearSwaps(): void {
    this.logger.log('Clearing all Stellar swaps (simulated)');
    // No-op for now - in production, this would interact with the contract
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; contractId?: string; network?: string } {
    const config = this.sorobanClient.getConfig();
    return {
      initialized: this.sorobanClient.isInitialized(),
      contractId: config.contractId,
      network: config.network,
    };
  }
}
