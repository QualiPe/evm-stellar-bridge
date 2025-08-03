import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

// MultiHtlcUSDC Contract ABI
const MULTI_HTLC_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'swapId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'hashlock',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
    ],
    name: 'Funded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'swapId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'preimage',
        type: 'bytes32',
      },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'swapId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'Refunded',
    type: 'event',
  },
  // Functions
  {
    inputs: [
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_hashlock',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_timelock',
        type: 'uint256',
      },
    ],
    name: 'fund',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_swapId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_preimage',
        type: 'bytes32',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_swapId',
        type: 'bytes32',
      },
    ],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_swapId',
        type: 'bytes32',
      },
    ],
    name: 'getSwapDetails',
    outputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'hashlock',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'isFunded',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'isWithdrawn',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'isRefunded',
        type: 'bool',
      },
      {
        internalType: 'bytes32',
        name: 'preimage',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_swapId',
        type: 'bytes32',
      },
    ],
    name: 'isSwapFunded',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_swapId',
        type: 'bytes32',
      },
    ],
    name: 'isSwapExpired',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSwapCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface EvmSwapDetails {
  sender: string;
  recipient: string;
  amount: string; // Changed from bigint to string for JSON serialization
  hashlock: string;
  timelock: string; // Changed from bigint to string for JSON serialization
  isFunded: boolean;
  isWithdrawn: boolean;
  isRefunded: boolean;
  preimage: string;
}

export interface EvmFundParams {
  recipient: string;
  amount: bigint;
  hashlock: string;
  timelock: bigint;
}

@Injectable()
export class EvmHtlcService {
  private readonly logger = new Logger(EvmHtlcService.name);
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;

  constructor() {
    // Initialize provider asynchronously to avoid blocking constructor
    this.initializeProvider().catch((error) => {
      this.logger.error('Failed to initialize EVM HTLC service:', error);
    });
  }

  private async initializeProvider() {
    try {
      // Initialize provider and signer
      // In production, these would come from environment variables
      const rpcUrl = process.env.EVM_RPC_URL || 'http://localhost:8545';
      const privateKey =
        process.env.EVM_PRIVATE_KEY ||
        '0x0000000000000000000000000000000000000000000000000000000000000001';

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Contract address would come from environment or deployment
      const contractAddress =
        process.env.EVM_HTLC_CONTRACT_ADDRESS ||
        '0xD63FD591fd0c6a73B48aD7D5b25A6A6efce11354';
      this.contract = new ethers.Contract(
        contractAddress,
        MULTI_HTLC_ABI,
        this.signer,
      );

      this.logger.log('EVM HTLC service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize EVM HTLC service:', error);
      // Don't throw error in constructor to avoid blocking service startup
    }
  }

  /**
   * Fund a new HTLC swap on EVM
   */
  async fund(params: EvmFundParams): Promise<string> {
    try {
      this.logger.log(
        `Funding HTLC swap for recipient: ${params.recipient}, amount: ${params.amount}`,
      );

      const tx = await this.contract.fund(
        params.recipient,
        params.amount,
        params.hashlock,
        params.timelock,
      );

      const receipt = await tx.wait();

      // Find the Funded event to get the swapId
      const fundedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'Funded';
        } catch {
          return false;
        }
      });

      if (fundedEvent) {
        const parsed = this.contract.interface.parseLog(fundedEvent);
        const swapId = parsed?.args[0]; // swapId is the first argument
        this.logger.log(`HTLC swap funded successfully. SwapId: ${swapId}`);
        return swapId;
      }

      throw new Error('Funded event not found in transaction receipt');
    } catch (error) {
      this.logger.error('Error funding HTLC swap:', error);
      throw error;
    }
  }

  /**
   * Withdraw from HTLC using preimage
   */
  async withdraw(swapId: string, preimage: string): Promise<void> {
    try {
      this.logger.log(`Withdrawing from HTLC swap: ${swapId}`);

      const tx = await this.contract.withdraw(swapId, preimage);
      await tx.wait();

      this.logger.log(`HTLC swap withdrawn successfully: ${swapId}`);
    } catch (error) {
      this.logger.error(`Error withdrawing from HTLC swap ${swapId}:`, error);
      throw error;
    }
  }

  /**
   * Refund HTLC after timelock expires
   */
  async refund(swapId: string): Promise<void> {
    try {
      this.logger.log(`Refunding HTLC swap: ${swapId}`);

      const tx = await this.contract.refund(swapId);
      await tx.wait();

      this.logger.log(`HTLC swap refunded successfully: ${swapId}`);
    } catch (error) {
      this.logger.error(`Error refunding HTLC swap ${swapId}:`, error);
      throw error;
    }
  }

  /**
   * Get HTLC details by swap ID
   */
  async getSwapDetails(swapId: string): Promise<EvmSwapDetails> {
    try {
      this.logger.log(`Getting swap details for: ${swapId}`);

      const details = await this.contract.getSwapDetails(swapId);

      const swapDetails: EvmSwapDetails = {
        sender: details[0],
        recipient: details[1],
        amount: details[2].toString(), // Convert BigInt to string for JSON serialization
        hashlock: details[3],
        timelock: details[4].toString(), // Convert BigInt to string for JSON serialization
        isFunded: details[5],
        isWithdrawn: details[6],
        isRefunded: details[7],
        preimage: details[8],
      };

      this.logger.log(
        `Swap details retrieved: ${JSON.stringify(swapDetails, null, 2)}`,
      );
      return swapDetails;
    } catch (error) {
      this.logger.error(`Error getting swap details for ${swapId}:`, error);
      throw error;
    }
  }

  /**
   * Check if swap exists and is funded
   */
  async isSwapFunded(swapId: string): Promise<boolean> {
    try {
      const isFunded = await this.contract.isSwapFunded(swapId);
      this.logger.log(`Swap ${swapId} funded status: ${isFunded}`);
      return isFunded;
    } catch (error) {
      this.logger.error(`Error checking if swap ${swapId} is funded:`, error);
      throw error;
    }
  }

  /**
   * Check if swap is expired
   */
  async isSwapExpired(swapId: string): Promise<boolean> {
    try {
      const isExpired = await this.contract.isSwapExpired(swapId);
      this.logger.log(`Swap ${swapId} expired status: ${isExpired}`);
      return isExpired;
    } catch (error) {
      this.logger.error(`Error checking if swap ${swapId} is expired:`, error);
      throw error;
    }
  }

  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<bigint> {
    try {
      const balance = await this.contract.getContractBalance();
      this.logger.log(`Contract balance: ${balance}`);
      return balance;
    } catch (error) {
      this.logger.error('Error getting contract balance:', error);
      throw error;
    }
  }

  /**
   * Check if service is properly initialized
   */
  isInitialized(): boolean {
    return !!(this.provider && this.signer && this.contract);
  }

  /**
   * Get total number of swaps
   */
  async getSwapCount(): Promise<bigint> {
    try {
      if (!this.isInitialized()) {
        throw new Error('EVM HTLC service not properly initialized');
      }
      const count = await this.contract.getSwapCount();
      this.logger.log(`Total swap count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Error getting swap count:', error);
      throw error;
    }
  }

  /**
   * Listen to contract events
   */
  onFunded(
    callback: (
      swapId: string,
      sender: string,
      recipient: string,
      amount: bigint,
      hashlock: string,
      timelock: bigint,
    ) => void,
  ): void {
    this.contract.on('Funded', callback);
  }

  onWithdrawn(
    callback: (swapId: string, recipient: string, preimage: string) => void,
  ): void {
    this.contract.on('Withdrawn', callback);
  }

  onRefunded(callback: (swapId: string, sender: string) => void): void {
    this.contract.on('Refunded', callback);
  }

  /**
   * Remove event listeners
   */
  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}
