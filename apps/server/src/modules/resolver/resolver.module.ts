import { Module } from '@nestjs/common';
import { ResolverService } from './resolver.service';
import { ConfigModule } from '../../shared/config.module';
@Module({
  imports: [ConfigModule],
  providers: [ResolverService],
  exports: [ResolverService],
})
export class ResolverModule {}
