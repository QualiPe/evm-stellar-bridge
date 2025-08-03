import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { StellarHtlcService } from './stellar-htlc.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateSwapDto } from './dtos/stellar-swap.dto';

@Controller('htlc/stellar')
export class StellarHtlcController {
  private readonly logger = new Logger(StellarHtlcController.name);

  constructor(private readonly stellarHtlcService: StellarHtlcService) {}

  @Get('stellar/status')
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

  @Post('stellar/create')
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

  // @Post('stellar/withdraw')
  // @ApiOperation({ summary: 'Withdraw from Stellar HTLC swap' })
  // @ApiResponse({ status: 200, description: 'Withdrawal successful' })
  // async withdrawStellarSwap(
  //   @Body() body: { swapId: string; recipient: string; preimage: string },
  // ): Promise<{ success: boolean }> {
  //   this.logger.log(`Withdrawing from Stellar HTLC swap: ${body.swapId}`);
  //   await this.stellarHtlcService.withdraw(
  //     body.swapId,
  //     body.recipient,
  //     body.preimage,
  //   );
  //   return { success: true };
  // }

  // @Post('stellar/refund')
  // @ApiOperation({ summary: 'Refund Stellar HTLC swap' })
  // @ApiResponse({ status: 200, description: 'Refund successful' })
  // async refundStellarSwap(
  //   @Body() body: { swapId: string; sender: string },
  // ): Promise<{ success: boolean }> {
  //   this.logger.log(`Refunding Stellar HTLC swap: ${body.swapId}`);
  //   await this.stellarHtlcService.refund(body.swapId, body.sender);
  //   return { success: true };
  // }

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
