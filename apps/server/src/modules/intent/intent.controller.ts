import {
    Body, Controller, Get, NotFoundException, Param, Patch, Post, Delete, BadRequestException,
  } from '@nestjs/common';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateIntentDto } from './dto';
import { IntentService } from './intent.service';
import { IntentDto } from './response.dto';
import { IntentStatus } from '../../shared/types';
  
@ApiTags('intents')
@Controller('intents')
export class IntentController {
    constructor(private readonly svc: IntentService) {}
    @Post()
    @ApiOperation({ summary: 'Create intent and get a composed plan (1inch + Horizon paths)' })
    @ApiBody({
      type: CreateIntentDto,
      examples: {
        evmToStellar: {
          summary: 'EVM → Stellar (EXACT_IN: WETH → XLM)',
          value: {
            direction: 'EVM_TO_STELLAR',
            fromChainId: 1,
            fromToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            toToken: 'XLM',
            amountIn: '0.01',
            toAddress: 'GCFX...DEST',
          },
        },
        evmToStellarExactOut: {
          summary: 'EVM → Stellar (EXACT_OUT: WETH → XLM)',
          value: {
            direction: 'EVM_TO_STELLAR',
            mode: 'EXACT_OUT',
            fromChainId: 1,
            fromToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            toToken: 'XLM',
            amountOut: '100',
            toAddress: 'GCFX...DEST',
          },
        },
        stellarToEvm: {
          summary: 'Stellar → EVM (EXACT_IN: XLM → WETH)',
          value: {
            direction: 'STELLAR_TO_EVM',
            fromToken: 'XLM',
            toToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            amountIn: '25',
            toAddress: 'GCFX...DEST',
          },
        },
        stellarToEvmExactOut: {
          summary: 'Stellar → EVM (EXACT_OUT: XLM → WETH)',
          value: {
            direction: 'STELLAR_TO_EVM',
            mode: 'EXACT_OUT',
            fromToken: 'XLM',
            toToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            amountOut: '0.01',
            toAddress: 'GCFX...DEST',
          },
        },
      },
    })
    @ApiOkResponse({ type: IntentDto })
    create(@Body() dto: CreateIntentDto) {
      return this.svc.create(dto);
    }
  
    @Get('all')
    @ApiOperation({ summary: 'Get all intents (for debugging)' })
    @ApiOkResponse({ type: [IntentDto] })
    getAll() {
      return this.svc.getAllIntents();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get intent by id' })
    @ApiParam({ name: 'id', example: 'e3f4c9a1b2' })
    @ApiOkResponse({ type: IntentDto })
    @ApiNotFoundResponse({ description: 'Intent not found' })
    get(@Param('id') id: string) {
      const i = this.svc.get(id);
      if (!i) throw new NotFoundException('Intent not found');
      return i;
    }
  
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update intent status manually' })
    async updateStatus(
      @Param('id') id: string,
      @Body() body: { status: IntentStatus; tx?: Record<string, string> }
    ): Promise<{ success: boolean; message: string }> {
      try {
        await this.svc.patchStatus(id, body.status, body.tx);
        
        return {
          success: true,
          message: `Intent ${id} status updated to ${body.status}`
        };
      } catch (error) {
        throw new BadRequestException(`Failed to update intent status: ${error.message}`);
      }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete intent (for stuck intents)' })
    async deleteIntent(
      @Param('id') id: string
    ): Promise<{ success: boolean; message: string }> {
      try {
        // This would need to be implemented in the service
        // For now, we'll update status to 'error' to clear it
        await this.svc.patchStatus(id, 'error');
        return {
          success: true,
          message: `Intent ${id} marked as error and cleared from processing`
        };
      } catch (error) {
        throw new BadRequestException(`Failed to delete intent: ${error.message}`);
      }
    }

    @Get(':id/preimage')
    @ApiOperation({ summary: 'Get intent preimage (for testing/relayer)' })
    @ApiParam({ name: 'id', example: 'e3f4c9a1b2' })
    @ApiOkResponse({ description: 'Intent with preimage' })
    @ApiNotFoundResponse({ description: 'Intent not found' })
    getPreimage(@Param('id') id: string) {
      const i = this.svc.getWithPreimage(id);
      if (!i) throw new NotFoundException('Intent not found');
      return { preimage: i.preimage };
    }

    @Get('find-by-hashlock/:hashlock')
    @ApiOperation({ summary: 'Find intent by hashlock (for debugging)' })
    @ApiParam({ name: 'hashlock', example: '0x1234...' })
    @ApiOkResponse({ description: 'Intent found by hashlock' })
    @ApiNotFoundResponse({ description: 'Intent not found' })
    findByHashlock(@Param('hashlock') hashlock: string) {
      const i = this.svc.findByHashlock(hashlock);
      if (!i) throw new NotFoundException('Intent not found for hashlock');
      return i;
    }

    @Get('find-by-swapid/:swapId')
    @ApiOperation({ summary: 'Find intent by SwapId (for debugging)' })
    @ApiParam({ name: 'swapId', example: '0x1234...' })
    @ApiOkResponse({ description: 'Intent found by SwapId' })
    @ApiNotFoundResponse({ description: 'Intent not found' })
    findBySwapId(@Param('swapId') swapId: string) {
      const i = this.svc.findBySwapId(swapId);
      if (!i) throw new NotFoundException('Intent not found for SwapId');
      return i;
    }
}