import { Injectable, Logger } from '@nestjs/common';
import { Client, Keypair, Networks } from '@QualiPe/htlc-contract';
import { createClient, createSwap } from '@QualiPe/htlc-helpers';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { ENV as env } from '../../shared/config.module';
import { CreateSwapDto } from './dtos/stellar-swap.dto';

@Injectable()
export class StellarHtlcService {
  private readonly logger = new Logger(StellarHtlcService.name);
  private readonly client: Client;
  private readonly adminKeypair: Keypair;
  private swapCounter: number = 0; // Track swap counter like the EVM contract

  constructor() {
    this.adminKeypair = Keypair.fromSecret(env.STELLAR_DEPLOYER_SECRET);

    this.client = createClient({
      networkPassphrase: Networks.TESTNET,
      rpcUrl: 'https://soroban-testnet.stellar.org', // TODO: use env variable or something
      contractId: env.STELLAR_HTLC_CONTRACT_ADDRESS,
      signerKeypair: this.adminKeypair,
    });
  }

  async fund(params: CreateSwapDto): Promise<string> {
    // Convert amount to bigint
    const amount = BigInt(params.amount);

    // Calculate timelock (convert hours to seconds and add to current time)
    const timelock = BigInt(
      Math.floor(Date.now() / 1000) + params.timelockHours * 3600,
    );

    // Generate hashlock for EVM compatibility (the helpers will handle Soroban format)
    const preimage = Buffer.from(params.secret, 'utf8');
    const hashlockHex =
      '0x' + crypto.createHash('sha256').update(preimage).digest('hex');

    // Generate swap ID using the same logic as the Ethereum contract
    const swapId = this.generateSwapId(
      this.adminKeypair.publicKey(),
      params.recipient,
      amount,
      hashlockHex, // Use hex version for EVM compatibility
      timelock,
    );

    // Convert swapId to buffer for Stellar contract
    const swapIdBuffer = Buffer.from(swapId.slice(2), 'hex'); // Remove '0x' prefix

    await createSwap(this.client, {
      swapId: swapIdBuffer,
      sender: this.adminKeypair.publicKey(),
      recipient: params.recipient,
      tokenId: params.tokenId,
      amount: amount,
      timelockHours: params.timelockHours,
      secret: params.secret, // Pass secret directly - helpers will hash it
    });

    return swapId;
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
