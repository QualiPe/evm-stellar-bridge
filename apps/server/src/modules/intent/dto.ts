import { IsIn, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateIntentInput, Direction } from '../../shared/types';

export class CreateIntentDto implements CreateIntentInput {
  @ApiProperty({
    description: 'Swap direction',
    enum: ['EVM_TO_STELLAR', 'STELLAR_TO_EVM'],
    example: 'EVM_TO_STELLAR',
  })
  @IsIn(['EVM_TO_STELLAR', 'STELLAR_TO_EVM'])
  direction!: Direction;

  @ApiPropertyOptional({
    description: 'EVM chainId (e.g., Sepolia = 11155111). Optional for STELLAR_TO_EVM',
    example: 11155111,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fromChainId?: number;

  @ApiProperty({
    description:
      'For EVM→Stellar: EVM token address (0x...). For Stellar→EVM: "XLM" or "CODE:ISSUER".',
    examples: {
      evm: { summary: 'EVM token', value: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2' },
      stellarNative: { summary: 'Stellar native', value: 'XLM' },
      stellarAsset: { summary: 'Stellar issued asset', value: 'USDC:GA...ISSUER' },
    },
  })
  @IsString()
  fromToken!: string;

  @ApiProperty({
    description:
      'Target token/asset on destination chain: EVM 0x... or Stellar "XLM"/"CODE:ISSUER".',
    examples: {
      toXlm: { value: 'XLM' },
      toEvm: { value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      toIssued: { value: 'USDC:GA...ISSUER' },
    },
  })
  @IsString()
  toToken!: string;

  @ApiProperty({
    description: 'Human amount',
    example: '1.0',
  })
  @IsString()
  amountIn!: string;

  @ApiProperty({
    description: 'Stellar G-address of beneficiary (used when destination is Stellar).',
    example: 'GCFX...DESTINATION',
  })
  @IsString()
  toAddress!: string;
}