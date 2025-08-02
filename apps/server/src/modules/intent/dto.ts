import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsInt,
  Min,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateIntentDto {
  @ApiProperty({ enum: ['EVM_TO_STELLAR', 'STELLAR_TO_EVM'] })
  @IsIn(['EVM_TO_STELLAR', 'STELLAR_TO_EVM'])
  direction!: 'EVM_TO_STELLAR' | 'STELLAR_TO_EVM';

  @ApiPropertyOptional({
    description: 'Amount mode (default: EXACT_IN)',
    enum: ['EXACT_IN', 'EXACT_OUT'],
    default: 'EXACT_IN',
  })
  @IsOptional()
  @IsIn(['EXACT_IN', 'EXACT_OUT'])
  mode?: 'EXACT_IN' | 'EXACT_OUT';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  fromChainId?: number;

  @ApiProperty({ example: '0xC02a...WETH or XLM or USDC:GA5Z...' })
  @IsString()
  fromToken!: string;

  @ApiProperty({ example: 'XLM or 0xC02a...WETH or USDC:GA5Z...' })
  @IsString()
  toToken!: string;

  @ApiProperty({ example: 'G... or 0x...' })
  @IsString()
  toAddress!: string;

  @ApiPropertyOptional({
    description: 'Human amount (required when mode = EXACT_IN)',
    example: '0.01',
  })
  @ValidateIf((o) => o.mode !== 'EXACT_OUT')
  @IsString()
  amountIn?: string;

  @ApiPropertyOptional({
    description: 'Desired output amount (required when mode = EXACT_OUT)',
    example: '25',
  })
  @ValidateIf((o) => o.mode === 'EXACT_OUT')
  @IsString()
  amountOut?: string;
}
