import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  EvmHtlcService,
  EvmFundParams,
  EvmSwapDetails,
} from './evm-htlc.service';
import { RelayerService } from './relayer.service';

@ApiTags('htlc')
@Controller('htlc')
export class HtlcController {
  private readonly logger = new Logger(HtlcController.name);

  constructor(
    private readonly evmHtlcService: EvmHtlcService,
    private readonly relayerService: RelayerService,
  ) {}

  @Get('evm/status')
  @ApiOperation({ summary: 'Get EVM HTLC service status' })
  @ApiResponse({ status: 200, description: 'Service status' })
  async getEvmStatus() {
    try {
      const balance = await this.evmHtlcService.getContractBalance();
      const count = await this.evmHtlcService.getSwapCount();

      return {
        status: 'operational',
        contractBalance: balance.toString(),
        totalSwaps: count.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting EVM status:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('evm/swap/:swapId')
  @ApiOperation({ summary: 'Get EVM swap details' })
  @ApiResponse({ status: 200, description: 'Swap details', type: Object })
  async getEvmSwap(@Param('swapId') swapId: string): Promise<EvmSwapDetails> {
    this.logger.log(`Getting EVM swap details for: ${swapId}`);
    return await this.evmHtlcService.getSwapDetails(swapId);
  }

  @Get('evm/swap/:swapId/funded')
  @ApiOperation({ summary: 'Check if EVM swap is funded' })
  @ApiResponse({ status: 200, description: 'Funding status' })
  async isEvmSwapFunded(
    @Param('swapId') swapId: string,
  ): Promise<{ funded: boolean }> {
    this.logger.log(`Checking if EVM swap is funded: ${swapId}`);
    const funded = await this.evmHtlcService.isSwapFunded(swapId);
    return { funded };
  }

  @Get('evm/swap/:swapId/expired')
  @ApiOperation({ summary: 'Check if EVM swap is expired' })
  @ApiResponse({ status: 200, description: 'Expiration status' })
  async isEvmSwapExpired(
    @Param('swapId') swapId: string,
  ): Promise<{ expired: boolean }> {
    this.logger.log(`Checking if EVM swap is expired: ${swapId}`);
    const expired = await this.evmHtlcService.isSwapExpired(swapId);
    return { expired };
  }

  @Post('evm/fund')
  @ApiOperation({ summary: 'Fund a new EVM HTLC swap' })
  @ApiResponse({ status: 201, description: 'Swap funded successfully' })
  async fundEvmSwap(
    @Body() params: EvmFundParams,
  ): Promise<{ swapId: string }> {
    this.logger.log(`Funding EVM HTLC swap: ${JSON.stringify(params)}`);
    const swapId = await this.evmHtlcService.fund(params);
    return { swapId };
  }

  @Post('evm/withdraw')
  @ApiOperation({ summary: 'Withdraw from EVM HTLC swap' })
  @ApiResponse({ status: 200, description: 'Withdrawal successful' })
  async withdrawEvmSwap(
    @Body() body: { swapId: string; preimage: string },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Withdrawing from EVM HTLC swap: ${body.swapId}`);
    await this.evmHtlcService.withdraw(body.swapId, body.preimage);
    return { success: true };
  }

  @Post('evm/refund')
  @ApiOperation({ summary: 'Refund EVM HTLC swap' })
  @ApiResponse({ status: 200, description: 'Refund successful' })
  async refundEvmSwap(
    @Body() body: { swapId: string },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Refunding EVM HTLC swap: ${body.swapId}`);
    await this.evmHtlcService.refund(body.swapId);
    return { success: true };
  }

  // Relayer endpoints
  @Post('relayer/start')
  @ApiOperation({ summary: 'Start the HTLC relayer service' })
  @ApiResponse({ status: 200, description: 'Relayer started successfully' })
  async startRelayer(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Starting HTLC relayer service');
    await this.relayerService.start();
    return { success: true, message: 'Relayer started successfully' };
  }

  @Post('relayer/stop')
  @ApiOperation({ summary: 'Stop the HTLC relayer service' })
  @ApiResponse({ status: 200, description: 'Relayer stopped successfully' })
  async stopRelayer(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Stopping HTLC relayer service');
    this.relayerService.stop();
    return { success: true, message: 'Relayer stopped successfully' };
  }

  @Get('relayer/status')
  @ApiOperation({ summary: 'Get relayer service status' })
  @ApiResponse({ status: 200, description: 'Relayer status' })
  async getRelayerStatus(): Promise<{
    isRunning: boolean;
    currentSwapId: string | null;
    retryCount: number;
  }> {
    return this.relayerService.getStatus();
  }
}
