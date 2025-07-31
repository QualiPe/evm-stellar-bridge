import {
    Body, Controller, Get, NotFoundException, Param, Patch, Post,
  } from '@nestjs/common';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateIntentDto } from './dto';
import { IntentService } from './intent.service';
import { IntentDto } from './response.dto';
  
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
          summary: 'EVM → Stellar (WETH → XLM)',
          value: {
            direction: 'EVM_TO_STELLAR',
            fromChainId: 11155111,
            fromToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            toToken: 'XLM',
            amountIn: '0.01',
            toAddress: 'GCFX...DEST',
          },
        },
        stellarToEvm: {
          summary: 'Stellar → EVM (USDC → WETH)',
          value: {
            direction: 'STELLAR_TO_EVM',
            fromToken: 'XLM',
            toToken: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
            amountIn: '25',
            toAddress: 'GCFX...DEST',
          },
        },
      },
    })
    @ApiOkResponse({ type: IntentDto })
    create(@Body() dto: CreateIntentDto) {
      return this.svc.create(dto);
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
    @ApiOperation({ summary: 'Patch intent status (for relayer)' })
    @ApiParam({ name: 'id', example: 'e3f4c9a1b2' })
    @ApiOkResponse({ type: IntentDto })
    @ApiNotFoundResponse({ description: 'Intent not found' })
    patch(
      @Param('id') id: string,
      @Body() body: { status: string; tx?: Record<string, string> },
    ) {
      const i = this.svc.patchStatus(id, body.status as any, body.tx);
      if (!i) throw new NotFoundException('Intent not found');
      return i;
    }
}