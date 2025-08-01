import { Module } from '@nestjs/common';
import { IntentService } from './intent.service';
import { IntentController } from './intent.controller';
import { ResolverModule } from '../resolver/resolver.module';

@Module({
  imports: [ResolverModule],
  providers: [IntentService],
  controllers: [IntentController],
  exports: [IntentService],
})
export class IntentModule {}
