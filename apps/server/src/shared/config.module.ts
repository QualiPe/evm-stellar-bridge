import { Module } from '@nestjs/common';
import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ONEINCH_API_KEY: z.string().min(1, 'ONEINCH_API_KEY is required'),
  ONEINCH_CHAIN_FOR_QUOTES: z.string().default('1'),
});

export type AppEnv = z.infer<typeof EnvSchema>;
export const ENV = EnvSchema.parse(process.env);

@Module({
  providers: [{ provide: 'ENV', useValue: ENV }],
  exports: ['ENV'],
})
export class ConfigModule {}