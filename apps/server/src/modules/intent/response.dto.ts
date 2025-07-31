import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LegEvmDto {
  @ApiProperty({ example: '1inch' }) via!: '1inch';
  @ApiProperty({ example: '0xC02a...WETH' }) from!: string;
  @ApiProperty({ example: 'USDC' }) to!: string;
  @ApiPropertyOptional({ example: '99500000', description: 'toAmount in minor units' })
  toAmountMinor?: string;
  @ApiPropertyOptional({ example: '38.620321', description: 'toAmount in human units (optional)' })
  toAmount?: string;
  @ApiPropertyOptional({ description: 'Raw 1inch response' })
  raw?: any;
}

class LegStellarDto {
  @ApiProperty({ example: 'strict-send' }) via!: 'strict-send' | 'strict-receive';
  @ApiPropertyOptional({ example: '124.80', description: 'strict-send: destination amount (human)' })
  destAmount?: string;
  @ApiPropertyOptional({ example: '38.62', description: 'strict-receive: required source amount (human)' })
  sourceAmount?: string;
  @ApiPropertyOptional({ description: 'Best path array' }) path?: any[];
  @ApiPropertyOptional({ description: 'Raw Horizon record' }) raw?: any;
}

class TimelocksDto {
  @ApiProperty({ example: 3600 }) ethSec!: number;
  @ApiProperty({ example: 2400 }) stellarSec!: number;
}

class MinLockDto {
  @ApiProperty({ example: '99.50', description: 'EVM leg min lock (human, USDC)' })
  evm!: string;
  @ApiProperty({ example: '99.50', description: 'Stellar leg min lock (human, USDC)' })
  stellar!: string;
}

class SummaryTokenDto {
  @ApiProperty({ example: 'EVM', enum: ['EVM', 'Stellar'] })
  chain!: 'EVM' | 'Stellar';

  @ApiProperty({ example: 'WETH' })
  token!: string;

  @ApiProperty({ example: 18, description: 'Token decimals' })
  decimals!: number;

  @ApiProperty({ example: '0.01', description: 'Human amount for UI' })
  amountHuman!: string;
}

class SummaryBridgeSideDto {
  @ApiProperty({ example: '38.576317', description: 'USDC human amount' })
  human!: string;

  @ApiPropertyOptional({ example: '38576317', description: 'USDC minor amount (optional for EVM)' })
  minor?: string;

  @ApiProperty({ example: 6, description: 'Decimals (6 for USDC on EVM, 7 on Stellar classical assets)' })
  decimals!: number;
}

class SummaryBridgeDto {
  @ApiProperty({ type: SummaryBridgeSideDto })
  evmUSDC!: SummaryBridgeSideDto;

  @ApiProperty({ type: SummaryBridgeSideDto })
  stellarUSDC!: SummaryBridgeSideDto;
}

class PlanSummaryDto {
  @ApiProperty({ enum: ['EXACT_IN', 'EXACT_OUT'] })
  mode!: 'EXACT_IN' | 'EXACT_OUT';

  @ApiProperty({ type: SummaryTokenDto })
  src!: SummaryTokenDto;

  @ApiProperty({ type: SummaryBridgeDto })
  bridge!: SummaryBridgeDto;

  @ApiProperty({ type: SummaryTokenDto })
  dst!: SummaryTokenDto;

  @ApiProperty({ example: 30 })
  quoteTtlSec!: number;
}

export class IntentPlanDto {
  @ApiProperty({ example: '0xabc123...' }) hash!: string;

  @ApiPropertyOptional({ enum: ['EXACT_IN', 'EXACT_OUT'] })
  mode?: 'EXACT_IN' | 'EXACT_OUT';

  @ApiProperty({ type: TimelocksDto }) timelocks!: TimelocksDto;
  @ApiProperty({ type: MinLockDto }) minLock!: MinLockDto;
  @ApiPropertyOptional({ type: LegEvmDto }) evmLeg?: LegEvmDto;
  @ApiPropertyOptional({ type: LegStellarDto }) stellarLeg?: LegStellarDto;

  @ApiPropertyOptional({ description: 'Desired output amount (human), when mode = EXACT_OUT', example: '100.0' })
  amountOut?: string;

  @ApiPropertyOptional({ description: 'Estimated input amount (human), when mode = EXACT_OUT', example: '0.01' })
  amountInEstimated?: string;

  @ApiPropertyOptional({ type: PlanSummaryDto })
  summary?: PlanSummaryDto;
}

export class IntentRequestDto {
  @ApiProperty({ enum: ['EVM_TO_STELLAR', 'STELLAR_TO_EVM'] })
  direction!: 'EVM_TO_STELLAR' | 'STELLAR_TO_EVM';

  @ApiProperty({ enum: ['EXACT_IN', 'EXACT_OUT'] })
  mode!: 'EXACT_IN' | 'EXACT_OUT';

  @ApiPropertyOptional({ example: 1 })
  fromChainId?: number;

  @ApiProperty({ example: '0xC02a...WETH or XLM or USDC:GA5Z...' })
  fromToken!: string;

  @ApiProperty({ example: 'XLM or 0xC02a...WETH or USDC:GA5Z...' })
  toToken!: string;

  @ApiProperty({ example: 'G... or 0x...' })
  toAddress!: string;

  @ApiPropertyOptional({ description: 'Human amount when mode = EXACT_IN', example: '0.01' })
  amountIn?: string;

  @ApiPropertyOptional({ description: 'Human amount when mode = EXACT_OUT', example: '25' })
  amountOut?: string;

  @ApiProperty({ example: '2025-07-31T10:15:23.456Z' })
  createdAt!: string;
}

export class IntentDto {
  @ApiProperty({ example: 'e3f4c9a1b2' }) id!: string;
  @ApiProperty({
    enum: [
      'created',
      'evm_locked',
      'stellar_locked',
      'withdrawn_stellar',
      'withdrawn_evm',
      'refunded',
      'settled',
      'error',
    ],
  })
  status!:
    | 'created'
    | 'evm_locked'
    | 'stellar_locked'
    | 'withdrawn_stellar'
    | 'withdrawn_evm'
    | 'refunded'
    | 'settled'
    | 'error';

  @ApiProperty({ type: IntentPlanDto }) plan!: IntentPlanDto;

  @ApiPropertyOptional({
    description: 'TX hashes per network / step',
    example: { evm_lock: '0x...', stellar_withdraw: '...' },
  })
  tx?: Record<string, string>;

  @ApiProperty({ type: IntentRequestDto })
  request!: IntentRequestDto;
}