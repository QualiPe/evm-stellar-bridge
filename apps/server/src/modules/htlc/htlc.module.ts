import { Module } from '@nestjs/common';
import { EvmHtlcService } from './evm-htlc.service';
import { StellarHtlcService } from './stellar-htlc.service';
import { RelayerService } from './relayer.service';
import { HtlcController } from './htlc.controller';
import { IntentModule } from '../intent/intent.module';
import { ConfigModule } from 'src/shared/config.module';

@Module({
  imports: [IntentModule, ConfigModule],
  providers: [EvmHtlcService, StellarHtlcService, RelayerService],
  controllers: [HtlcController],
  exports: [EvmHtlcService, StellarHtlcService, RelayerService],
})
export class HtlcModule {}
