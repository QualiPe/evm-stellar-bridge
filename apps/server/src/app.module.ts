import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './shared/config.module';
import { ResolverModule } from './modules/resolver/resolver.module';
import { IntentModule } from './modules/intent/intent.module';

@Module({
  imports: [
    ConfigModule,
    ResolverModule,
    IntentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
