import { Module } from '@nestjs/common';
import { EvmHtlcService } from './evm-htlc.service';
import { StellarHtlcService } from './stellar-htlc.service';
import { SorobanClientService } from './soroban-client.service';
import { RelayerService } from './relayer.service';
import { HtlcController } from './htlc.controller';
import { IntentModule } from '../intent/intent.module';

@Module({
  imports: [IntentModule],
  providers: [EvmHtlcService, StellarHtlcService, SorobanClientService, RelayerService],
  controllers: [HtlcController],
  exports: [EvmHtlcService, StellarHtlcService, SorobanClientService, RelayerService],
})
export class HtlcModule {} 