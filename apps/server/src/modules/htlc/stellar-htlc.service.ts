import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { ENV as env } from '../../shared/config.module';
import {
  CreateSwapDto,
  RefundSwapDto,
  StellarSwap,
  WithdrawSwapDto,
} from './dtos/stellar-swap.dto';

@Injectable()
export class StellarHtlcService {
  private readonly logger = new Logger(StellarHtlcService.name);
  private swapCounter: number = 0; // Track swap counter like the EVM contract
  private swaps = new Map<string, any>(); // Mock storage for swaps

  constructor() {
    this.logger.log('StellarHtlcService initialized (mock mode)');
  }

  async fund(params: CreateSwapDto): Promise<string> {
    this.logger.log(`Mock: Creating Stellar HTLC swap for recipient: ${params.recipient}`);
    
    // Generate hashlock from secret
    const preimage = Buffer.from(params.secret, 'utf8');
    const hashlock = '0x' + crypto.createHash('sha256').update(preimage).digest('hex');
    
    // Calculate timelock
    const timelock = Math.floor(Date.now() / 1000) + params.timelockHours * 3600;
    
    // Generate swap ID using the same logic as the Ethereum contract
    const swapId = this.generateSwapId(
      'mock-sender',
      params.recipient,
      BigInt(params.amount),
      hashlock,
      BigInt(timelock),
    );

    // Store swap in mock storage
    this.swaps.set(swapId, {
      swapId,
      sender: 'mock-sender',
      recipient: params.recipient,
      tokenId: params.tokenId,
      amount: params.amount,
      hashlock: hashlock,
      timelock: timelock,
      secret: params.secret,
      isWithdrawn: false,
      isRefunded: false,
      createdAt: Date.now()
    });

    return swapId;
  }

  async withdraw(params: WithdrawSwapDto): Promise<string> {
    this.logger.log(`Mock: Withdrawing Stellar HTLC swap: ${params.swapId}`);
    
    const swap = this.swaps.get(params.swapId);
    if (!swap) {
      throw new HttpException('Swap not found', HttpStatus.NOT_FOUND);
    }

    swap.isWithdrawn = true;
    swap.preimage = params.preimage;
    this.swaps.set(params.swapId, swap);

    return params.swapId;
  }

  async refund(params: RefundSwapDto): Promise<string> {
    this.logger.log(`Mock: Refunding Stellar HTLC swap: ${params.swapId}`);
    
    const swap = this.swaps.get(params.swapId);
    if (!swap) {
      throw new HttpException('Swap not found', HttpStatus.NOT_FOUND);
    }

    swap.isRefunded = true;
    this.swaps.set(params.swapId, swap);

    return params.swapId;
  }

  async getSwap(swapId: string): Promise<StellarSwap> {
    const swap = this.swaps.get(swapId);
    if (!swap) {
      throw new HttpException('Swap not found', HttpStatus.NOT_FOUND);
    }

    const status = swap.isWithdrawn
      ? 'withdrawn'
      : swap.isRefunded
        ? 'refunded'
        : 'active';

    return {
      swapId,
      sender: swap.sender,
      recipient: swap.recipient,
      tokenId: swap.tokenId,
      amount: String(swap.amount),
      timelockHours: Math.floor(
        Number(swap.timelock - BigInt(Math.floor(Date.now() / 1000))) / 3600,
      ),
      secret: '', // Not available from contract
      hashlock: swap.hashlock,
      timelock: Number(swap.timelock),
      preimage: swap.preimage || '',
      status,
    };
  }

  /**
   * Generate swap ID using the same logic as the Ethereum contract
   * keccak256(abi.encodePacked(_sender, _recipient, _amount, _hashlock, _timelock, swapCounter))
   */
  private generateSwapId(
    sender: string,
    recipient: string,
    amount: bigint,
    hashlock: string,
    timelock: bigint,
  ): string {
    // Encode the parameters in the same way as the Ethereum contract
    const encoded = ethers.solidityPacked(
      ['address', 'address', 'uint256', 'bytes32', 'uint256', 'uint256'],
      [sender, recipient, amount, hashlock, timelock, this.swapCounter],
    );

    // Generate keccak256 hash
    const swapId = ethers.keccak256(encoded);

    // Increment counter for next swap (like the EVM contract)
    this.swapCounter++;

    return swapId;
  }
}
