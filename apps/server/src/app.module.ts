import { Module } from '@nestjs/common';
import { ConfigModule } from './shared/config.module';
import { ResolverModule } from './modules/resolver/resolver.module';
import { IntentModule } from './modules/intent/intent.module';

@Module({
  imports: [
    ConfigModule,
    ResolverModule,
    IntentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
