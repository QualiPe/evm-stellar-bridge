import { Module } from '@nestjs/common';
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';

dotenvConfig({
  path: resolve(process.cwd(), '.env'),
});

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ONEINCH_API_KEY: z.string().min(1, 'ONEINCH_API_KEY is required'),
  ONEINCH_CHAIN_FOR_QUOTES: z.string().default('1'),
  HORIZON_URL: z.string().url(),
  STELLAR_USDC_ISSUER: z.string().min(56),
  MIN_HAIRCUT_BPS: z.coerce.number().default(50),

  // Stellar
  STELLAR_ISSUER_SECRET: z.string().min(56),
  STELLAR_DISTRIBUTOR_SECRET: z.string().min(56),
  STELLAR_DEPLOYER_SECRET: z.string().min(56),
  STELLAR_HTLC_CONTRACT_ADDRESS: z.string().min(56),
  STELLAR_TOKEN_ID: z.string().min(56),
  STELLAR_ASSET_ADDRESS: z.string().min(56),
  STELLAR_ASSET_CODE: z.string(),
});

export type AppEnv = z.infer<typeof EnvSchema>;
export const ENV = EnvSchema.parse(process.env);

@Module({
  providers: [{ provide: 'ENV', useValue: ENV }],
  exports: ['ENV'],
})
export class ConfigModule {}
