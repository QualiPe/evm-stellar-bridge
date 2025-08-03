import { ApiProperty } from '@nestjs/swagger';

export class CreateSwapDto {
  // @ApiProperty({
  //   description: 'The swap ID of the swap',
  //   example: '123e4567-e89b-12d3-a456-426614174000',
  // })
  // swapId: string;

  @ApiProperty({
    description: 'The recipient of the swap',
    example: 'GB3KQJ6G6A7PXNZ62RSG36DPH267UOJJR376ZRPR6LA5M24Y525CCZ7V',
  })
  recipient: string;

  @ApiProperty({
    description: 'The token ID of the swap',
    example: 'CALEDUH4356NOQ55WS6KU27KVHH53TBZIKD3T7YTFKBADFAJEHUJDXPK',
  })
  tokenId: string;

  @ApiProperty({
    description: 'The amount of the swap',
    example: '1000000000000000000',
  })
  amount: string;

  @ApiProperty({
    description: 'The timelock hours of the swap',
    example: 10,
  })
  timelockHours: number = 10;

  @ApiProperty({
    description: 'The secret of the swap',
    example: 'secret123',
  })
  secret: string;
}

export class WithdrawSwapDto {
  @ApiProperty({
    description: 'The swap ID of the swap',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  swapId: string;

  @ApiProperty({
    description: 'The recipient of the swap',
    example: 'GB3KQJ6G6A7PXNZ62RSG36DPH267UOJJR376ZRPR6LA5M24Y525CCZ7V',
  })
  recipient: string;

  @ApiProperty({
    description: 'The preimage of the swap',
    example: 'preimage123',
  })
  preimage: string;
}

export class RefundSwapDto {
  @ApiProperty({
    description: 'The swap ID of the swap',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  swapId: string;

  @ApiProperty({
    description: 'The sender of the swap',
    example: 'GB3KQJ6G6A7PXNZ62RSG36DPH267UOJJR376ZRPR6LA5M24Y525CCZ7V',
  })
  sender: string;
}

export class StellarSwap {
  @ApiProperty({
    description: 'The swap ID of the swap',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  swapId: string;

  @ApiProperty({
    description: 'The sender of the swap',
    example: 'GB3KQJ6G6A7PXNZ62RSG36DPH267UOJJR376ZRPR6LA5M24Y525CCZ7V',
  })
  sender: string;

  @ApiProperty({
    description: 'The recipient of the swap',
    example: 'GB3KQJ6G6A7PXNZ62RSG36DPH267UOJJR376ZRPR6LA5M24Y525CCZ7V',
  })
  recipient: string;

  @ApiProperty({
    description: 'The token ID of the swap',
    example: 'CALEDUH4356NOQ55WS6KU27KVHH53TBZIKD3T7YTFKBADFAJEHUJDXPK',
  })
  tokenId: string;

  @ApiProperty({
    description: 'The amount of the swap',
    example: '1000000000000000000',
  })
  amount: string;

  @ApiProperty({
    description: 'The timelock hours of the swap',
    example: 10,
  })
  timelockHours: number;

  @ApiProperty({
    description: 'The secret of the swap',
    example: 'secret123',
  })
  secret: string;

  @ApiProperty({
    description: 'The hashlock of the swap',
    example: 'hashlock123',
  })
  hashlock: string;

  @ApiProperty({
    description: 'The timelock of the swap',
    example: 10,
  })
  timelock: number;

  @ApiProperty({
    description: 'The preimage of the swap',
    example: 'preimage123',
  })
  preimage: string;

  @ApiProperty({
    description: 'The status of the swap',
    example: 'created',
  })
  status: string;
}
