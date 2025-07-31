import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LegEvmDto {
  @ApiProperty({ example: '1inch' }) via!: '1inch';
  @ApiProperty({ example: '0xC02a...WETH' }) from!: string;
  @ApiProperty({ example: 'USDC' }) to!: string;
  @ApiPropertyOptional({ example: '99500000', description: 'toAmount in minor units' })
  toAmountMinor?: string;
  @ApiPropertyOptional({ description: 'Raw 1inch response' })
  raw?: any;
}

class LegStellarDto {
  @ApiProperty({ example: 'strict-send' }) via!: 'strict-send' | 'strict-receive';
  @ApiPropertyOptional({ example: '124.80' }) destAmount?: string;
  @ApiPropertyOptional({ description: 'Best path array' }) path?: any[];
  @ApiPropertyOptional({ description: 'Raw Horizon record' }) raw?: any;
}

class TimelocksDto {
  @ApiProperty({ example: 3600 }) ethSec!: number;
  @ApiProperty({ example: 2400 }) stellarSec!: number;
}

class MinLockDto {
  @ApiProperty({ example: '99.50', description: 'EVM leg min lock (human, USDC 6dec)' })
  evm!: string;
  @ApiProperty({ example: '124.80', description: 'Stellar leg min lock (human)' })
  stellar!: string;
}

export class IntentPlanDto {
  @ApiProperty({ example: '0xabc123...' }) hash!: string;
  @ApiProperty({ type: TimelocksDto }) timelocks!: TimelocksDto;
  @ApiProperty({ type: MinLockDto }) minLock!: MinLockDto;
  @ApiPropertyOptional({ type: LegEvmDto }) evmLeg?: LegEvmDto;
  @ApiPropertyOptional({ type: LegStellarDto }) stellarLeg?: LegStellarDto;
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
}