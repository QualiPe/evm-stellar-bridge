import { IsIn, IsOptional, IsInt, Min, IsString, IsEthereumAddress } from 'class-validator';
import { Direction, CreateIntentInput } from '../../shared/types';

export class CreateIntentDto implements CreateIntentInput {
  @IsIn(['EVM_TO_STELLAR','STELLAR_TO_EVM']) direction!: Direction;
  @IsOptional() @IsInt() @Min(1) fromChainId?: number;
  @IsString() fromToken!: string;
  @IsString() toToken!: string;
  @IsString() amountIn!: string;
  @IsString() toAddress!: string;
}