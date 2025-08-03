import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { StellarHtlcService } from './stellar-htlc.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CreateSwapDto,
  RefundSwapDto,
  StellarSwap,
  WithdrawSwapDto,
} from './dtos/stellar-swap.dto';

@Controller('htlc/stellar')
export class StellarHtlcController {
  private readonly logger = new Logger(StellarHtlcController.name);

  constructor(private readonly stellarHtlcService: StellarHtlcService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Stellar HTLC service status' })
  @ApiResponse({ status: 200, description: 'Service status' })
  getStellarStatus() {
    try {
      const contractAddress = process.env.STELLAR_HTLC_CONTRACT_ADDRESS;
      const network = process.env.STELLAR_NETWORK || 'testnet';

      return {
        status: 'operational',
        contractAddress: contractAddress,
        network: network,
        message: 'Stellar HTLC service connected to deployed Soroban contract',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting Stellar status:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // // Stellar HTLC endpoints
  // @Get('stellar/swap/:swapId')
  // @ApiOperation({ summary: 'Get Stellar swap details' })
  // @ApiResponse({ status: 200, description: 'Swap details', type: Object })
  // async getStellarSwap(
  //   @Param('swapId') swapId: string,
  // ): Promise<StellarSwapDetails | null> {
  //   this.logger.log(`Getting Stellar swap details for: ${swapId}`);
  //   return await this.stellarHtlcService.getSwap(swapId);
  // }

  @Post('create')
  @ApiOperation({ summary: 'Create a new Stellar HTLC swap' })
  @ApiResponse({ status: 201, description: 'Swap created successfully' })
  @ApiBody({ type: CreateSwapDto })
  async createStellarSwap(
    @Body() data: CreateSwapDto,
  ): Promise<{ success: boolean; swapId: string }> {
    this.logger.log(`Creating Stellar HTLC swap: ${JSON.stringify(data)}`);
    const swapId = await this.stellarHtlcService.fund(data);
    return { success: true, swapId };
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw from Stellar HTLC swap' })
  @ApiResponse({ status: 200, description: 'Withdrawal successful' })
  async withdrawStellarSwap(
    @Body() data: WithdrawSwapDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Withdrawing from Stellar HTLC swap: ${data.swapId}`);
    await this.stellarHtlcService.withdraw(data);
    return { success: true };
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund Stellar HTLC swap' })
  @ApiResponse({ status: 200, description: 'Refund successful' })
  async refundStellarSwap(
    @Body() data: RefundSwapDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Refunding Stellar HTLC swap: ${data.swapId}`);
    await this.stellarHtlcService.refund(data);
    return { success: true };
  }

  @Get('swap/:swapId')
  @ApiOperation({ summary: 'Get Stellar swap details' })
  @ApiResponse({ status: 200, description: 'Swap details', type: Object })
  async getStellarSwap(@Param('swapId') swapId: string): Promise<StellarSwap> {
    this.logger.log(`Getting Stellar swap details for: ${swapId}`);
    return await this.stellarHtlcService.getSwap(swapId);
  }

  @Get('swap/:swapId/funded')
  @ApiOperation({ summary: 'Check if Stellar swap is funded' })
  @ApiResponse({ status: 200, description: 'Funding status' })
  async isStellarSwapFunded(
    @Param('swapId') swapId: string,
  ): Promise<{ funded: boolean }> {
    this.logger.log(`Checking if Stellar swap is funded: ${swapId}`);
    const swap = await this.stellarHtlcService.getSwap(swapId);
    const funded = swap.status === 'active' || swap.status === 'withdrawn';
    return { funded };
  }

  @Get('swap/:swapId/expired')
  @ApiOperation({ summary: 'Check if Stellar swap is expired' })
  @ApiResponse({ status: 200, description: 'Expiration status' })
  async isStellarSwapExpired(
    @Param('swapId') swapId: string,
  ): Promise<{ expired: boolean }> {
    this.logger.log(`Checking if Stellar swap is expired: ${swapId}`);
    const swap = await this.stellarHtlcService.getSwap(swapId);
    const expired =
      swap.status === 'active' && swap.timelock < Math.floor(Date.now() / 1000);
    return { expired };
  }

  // @Post('stellar/verify-preimage')
  // @ApiOperation({ summary: 'Verify preimage for Stellar HTLC swap' })
  // @ApiResponse({ status: 200, description: 'Preimage verification result' })
  // async verifyStellarPreimage(
  //   @Body() body: { swapId: string; preimage: string },
  // ): Promise<{ valid: boolean }> {
  //   this.logger.log(`Verifying preimage for Stellar HTLC swap: ${body.swapId}`);
  //   const valid = await this.stellarHtlcService.verifyPreimage(
  //     body.swapId,
  //     body.preimage,
  //   );
  //   return { valid };
  // }

  // @Get('stellar/swaps')
  // @ApiOperation({ summary: 'Get all Stellar swaps (debugging)' })
  // @ApiResponse({ status: 200, description: 'All swaps' })
  // async getAllStellarSwaps(): Promise<StellarSwapDetails[]> {
  //   return this.stellarHtlcService.getAllSwaps();
  // }
}
