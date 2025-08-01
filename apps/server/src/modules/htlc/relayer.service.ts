import { Injectable, Logger } from '@nestjs/common';
import { EvmHtlcService } from './evm-htlc.service';
import { StellarHtlcService } from './stellar-htlc.service';
import { IntentService } from '../intent/intent.service';
import { IntentStatus } from '../../shared/types';

export interface RelayerConfig {
  pollIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private isRunning = false;
  private currentSwapId: string | null = null;
  private retryCount = 0;

  constructor(
    private readonly evmHtlcService: EvmHtlcService,
    private readonly stellarHtlcService: StellarHtlcService,
    private readonly intentService: IntentService,
  ) {}

  /**
   * Start the relayer service
   */
  async start(config: RelayerConfig = {
    pollIntervalMs: 10000, // 10 seconds
    maxRetries: 3,
    retryDelayMs: 5000, // 5 seconds
  }): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Relayer is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting HTLC relayer service');

    // Set up event listeners for EVM contract
    this.setupEvmEventListeners();

    // Start polling for swaps
    this.startPolling(config);
  }

  /**
   * Stop the relayer service
   */
  stop(): void {
    this.isRunning = false;
    this.logger.log('Stopping HTLC relayer service');
    
    // Remove event listeners
    this.evmHtlcService.removeAllListeners();
  }

  /**
   * Set up event listeners for EVM HTLC contract
   */
  private setupEvmEventListeners(): void {
    // Listen for funded events
    this.evmHtlcService.onFunded(async (swapId, sender, recipient, amount, hashlock, timelock) => {
      this.logger.log(`EVM HTLC funded: ${swapId}`);
      await this.handleEvmFunded(swapId, sender, recipient, amount, hashlock, timelock);
    });

    // Listen for withdrawn events
    this.evmHtlcService.onWithdrawn(async (swapId, recipient, preimage) => {
      this.logger.log(`EVM HTLC withdrawn: ${swapId}`);
      await this.handleEvmWithdrawn(swapId, recipient, preimage);
    });

    // Listen for refunded events
    this.evmHtlcService.onRefunded(async (swapId, sender) => {
      this.logger.log(`EVM HTLC refunded: ${swapId}`);
      await this.handleEvmRefunded(swapId, sender);
    });
  }

  /**
   * Start polling for active swaps
   */
  private async startPolling(config: RelayerConfig): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processActiveSwaps();
        await this.sleep(config.pollIntervalMs);
      } catch (error) {
        this.logger.error('Error in relayer polling loop:', error);
        await this.sleep(config.retryDelayMs);
      }
    }
  }

  /**
   * Process active swaps and execute relayer actions
   */
  private async processActiveSwaps(): Promise<void> {
    // Get all intents with active status
    const activeIntents = this.getActiveIntents();
    
    if (activeIntents.length === 0) {
      return;
    }

    // Process only one swap at a time (as per requirements)
    const intent = activeIntents[0];
    
    if (this.currentSwapId && this.currentSwapId !== intent.id) {
      this.logger.log(`Another swap ${this.currentSwapId} is in progress, skipping ${intent.id}`);
      return;
    }

    this.currentSwapId = intent.id;
    this.logger.log(`Processing swap: ${intent.id}, status: ${intent.status}`);

    try {
      await this.processSwap(intent);
    } catch (error) {
      this.logger.error(`Error processing swap ${intent.id}:`, error);
      this.retryCount++;
      
      if (this.retryCount >= 3) {
        this.intentService.patchStatus(intent.id, 'error');
        this.currentSwapId = null;
        this.retryCount = 0;
      }
    }
  }

  /**
   * Process a single swap based on its status
   */
  private async processSwap(intent: any): Promise<void> {
    switch (intent.status) {
      case 'created':
        await this.handleCreatedSwap(intent);
        break;
      case 'evm_locked':
        await this.handleEvmLockedSwap(intent);
        break;
      case 'stellar_locked':
        await this.handleStellarLockedSwap(intent);
        break;
      case 'withdrawn_stellar':
        await this.handleStellarWithdrawnSwap(intent);
        break;
      case 'withdrawn_evm':
        await this.handleEvmWithdrawnSwap(intent);
        break;
      default:
        this.logger.warn(`Unknown swap status: ${intent.status}`);
    }
  }

  /**
   * Handle newly created swap
   */
  private async handleCreatedSwap(intent: any): Promise<void> {
    this.logger.log(`Handling created swap: ${intent.id}`);
    
    // Check if EVM HTLC is funded
    const evmFunded = await this.evmHtlcService.isSwapFunded(intent.plan.hash);
    
    if (evmFunded) {
      this.intentService.patchStatus(intent.id, 'evm_locked');
      this.logger.log(`Swap ${intent.id} marked as EVM locked`);
    }
  }

  /**
   * Handle EVM locked swap - create Stellar HTLC
   */
  private async handleEvmLockedSwap(intent: any): Promise<void> {
    this.logger.log(`Handling EVM locked swap: ${intent.id}`);
    
    try {
      // Create Stellar HTLC with same hashlock
      await this.stellarHtlcService.createSwap({
        swapId: intent.plan.hash,
        sender: intent.request.toAddress, // Recipient on EVM becomes sender on Stellar
        recipient: intent.request.toAddress,
        token: 'USDC',
        amount: BigInt(intent.plan.minLock.stellar),
        hashlock: intent.plan.hash,
        timelock: BigInt(intent.plan.timelocks.stellarSec)
      });

      this.intentService.patchStatus(intent.id, 'stellar_locked');
      this.logger.log(`Swap ${intent.id} marked as Stellar locked`);
    } catch (error) {
      this.logger.error(`Error creating Stellar HTLC for swap ${intent.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle Stellar locked swap - monitor for withdrawal
   */
  private async handleStellarLockedSwap(intent: any): Promise<void> {
    this.logger.log(`Handling Stellar locked swap: ${intent.id}`);
    
    try {
      // Check if Stellar HTLC has been withdrawn
      const stellarSwap = await this.stellarHtlcService.getSwap(intent.plan.hash);
      
      if (stellarSwap && stellarSwap.isWithdrawn) {
        this.intentService.patchStatus(intent.id, 'withdrawn_stellar');
        this.logger.log(`Swap ${intent.id} marked as Stellar withdrawn`);
      }
    } catch (error) {
      this.logger.error(`Error checking Stellar HTLC for swap ${intent.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle Stellar withdrawn swap - withdraw from EVM HTLC
   */
  private async handleStellarWithdrawnSwap(intent: any): Promise<void> {
    this.logger.log(`Handling Stellar withdrawn swap: ${intent.id}`);
    
    try {
      // Get preimage from intent store
      const intentWithPreimage = this.getIntentWithPreimage(intent.id);
      if (!intentWithPreimage?.preimage) {
        throw new Error(`No preimage found for swap ${intent.id}`);
      }

      // Withdraw from EVM HTLC using preimage
      await this.evmHtlcService.withdraw(intent.plan.hash, intentWithPreimage.preimage);
      
      this.intentService.patchStatus(intent.id, 'withdrawn_evm');
      this.logger.log(`Swap ${intent.id} marked as EVM withdrawn`);
    } catch (error) {
      this.logger.error(`Error withdrawing from EVM HTLC for swap ${intent.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle EVM withdrawn swap - mark as settled
   */
  private async handleEvmWithdrawnSwap(intent: any): Promise<void> {
    this.logger.log(`Handling EVM withdrawn swap: ${intent.id}`);
    
    // Mark swap as settled
    this.intentService.patchStatus(intent.id, 'settled');
    this.logger.log(`Swap ${intent.id} marked as settled`);
    
    // Clear current swap
    this.currentSwapId = null;
    this.retryCount = 0;
  }

  /**
   * Handle EVM funded event
   */
  private async handleEvmFunded(swapId: string, sender: string, recipient: string, amount: bigint, hashlock: string, timelock: bigint): Promise<void> {
    this.logger.log(`EVM HTLC funded event: ${swapId}`);
    
    // Find intent by hashlock
    const intent = this.findIntentByHashlock(hashlock);
    if (intent) {
      this.intentService.patchStatus(intent.id, 'evm_locked');
      this.logger.log(`Intent ${intent.id} marked as EVM locked due to funding event`);
    }
  }

  /**
   * Handle EVM withdrawn event
   */
  private async handleEvmWithdrawn(swapId: string, recipient: string, preimage: string): Promise<void> {
    this.logger.log(`EVM HTLC withdrawn event: ${swapId}`);
    
    // Find intent by swapId
    const intent = this.findIntentByHashlock(swapId);
    if (intent) {
      this.intentService.patchStatus(intent.id, 'withdrawn_evm');
      this.logger.log(`Intent ${intent.id} marked as EVM withdrawn due to withdrawal event`);
    }
  }

  /**
   * Handle EVM refunded event
   */
  private async handleEvmRefunded(swapId: string, sender: string): Promise<void> {
    this.logger.log(`EVM HTLC refunded event: ${swapId}`);
    
    // Find intent by swapId
    const intent = this.findIntentByHashlock(swapId);
    if (intent) {
      this.intentService.patchStatus(intent.id, 'refunded');
      this.logger.log(`Intent ${intent.id} marked as refunded due to refund event`);
      
      // Clear current swap
      this.currentSwapId = null;
      this.retryCount = 0;
    }
  }

  /**
   * Get all active intents
   */
  private getActiveIntents(): any[] {
    return this.intentService.getActiveIntents();
  }

  /**
   * Get intent with preimage
   */
  private getIntentWithPreimage(intentId: string): any {
    return this.intentService.getWithPreimage(intentId);
  }

  /**
   * Find intent by hashlock
   */
  private findIntentByHashlock(hashlock: string): any {
    return this.intentService.findByHashlock(hashlock);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get relayer status
   */
  getStatus(): {
    isRunning: boolean;
    currentSwapId: string | null;
    retryCount: number;
  } {
    return {
      isRunning: this.isRunning,
      currentSwapId: this.currentSwapId,
      retryCount: this.retryCount,
    };
  }
} 