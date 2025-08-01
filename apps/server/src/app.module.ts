import { Module } from '@nestjs/common';
import { ConfigModule } from './shared/config.module';
import { ResolverModule } from './modules/resolver/resolver.module';
import { IntentModule } from './modules/intent/intent.module';
import { HtlcModule } from './modules/htlc/htlc.module';

@Module({
  imports: [
    ConfigModule,
    ResolverModule,
    IntentModule,
    HtlcModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
