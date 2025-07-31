import { Injectable } from '@nestjs/common';
import { ENV as env } from '../../shared/config.module';
import { oneInch, horizon } from './clients';
import { CreateIntentInput, IntentPlan } from '../../shared/types';
import { USDC_EVM_MAINNET, parseStellarAsset } from '../../shared/constants';
import { humanToMinor, minorToHuman, applyHaircutHuman } from '../../shared/amount';

@Injectable()
export class ResolverService {
  async buildPlan(input: CreateIntentInput): Promise<IntentPlan> {
    const timelocks = { ethSec: 60 * 60, stellarSec: 40 * 60 };
    const bps = env.MIN_HAIRCUT_BPS;

    if (input.direction === 'EVM_TO_STELLAR') {
      // (EVM) 1inch: fromToken -> USDC
      const amountMinor = humanToMinor(input.amountIn, 18);
      const q = await this.oneInchQuote(input.fromToken, USDC_EVM_MAINNET, amountMinor);
      const outUsdcMinor = q?.toAmount ?? '0';
      const outUsdcHuman = minorToHuman(outUsdcMinor, 6);

      // (Stellar) Horizon strict-send: USDC -> toAsset
      const dest = parseStellarAsset(input.toToken);
      const hp = await this.strictSend({ code: 'USDC', issuer: env.STELLAR_USDC_ISSUER }, outUsdcHuman, dest);

      return {
        hash: '0x',
        timelocks,
        minLock: {
          evm: applyHaircutHuman(outUsdcHuman, bps),
          stellar: applyHaircutHuman(hp?.destAmount ?? '0', bps),
        },
        evmLeg: { via: '1inch', from: input.fromToken, to: 'USDC', toAmountMinor: outUsdcMinor, raw: q },
        stellarLeg: { via: 'strict-send', destAmount: hp?.destAmount, path: hp?.path, raw: hp },
      };
    } else {
      // STELLAR_TO_EVM
      const src = parseStellarAsset(input.fromToken);
      const hp = await this.strictSend(src, input.amountIn, { code: 'USDC', issuer: env.STELLAR_USDC_ISSUER });
      const outUsdcHuman = hp?.destAmount ?? '0';
      const outUsdcMinor = humanToMinor(outUsdcHuman, 6);

      const q = await this.oneInchQuote(USDC_EVM_MAINNET, input.toToken, outUsdcMinor);

      return {
        hash: '0x',
        timelocks,
        minLock: {
          stellar: applyHaircutHuman(outUsdcHuman, bps),
          evm: applyHaircutHuman(minorToHuman(q?.toAmount ?? '0', 18), bps),
        },
        evmLeg: { via: '1inch', from: 'USDC', to: input.toToken, toAmountMinor: q?.toAmount, raw: q },
        stellarLeg: { via: 'strict-send', destAmount: outUsdcHuman, path: hp?.path, raw: hp },
      };
    }
  }

  private async oneInchQuote(from: string, to: string, amountMinor: string) {
    try {
      const { data } = await oneInch.get('/quote', {
        params: { fromTokenAddress: from, toTokenAddress: to, amount: amountMinor },
      });
      return data;
    } catch { return undefined; }
  }

  private async strictSend(sourceAsset: { code: string; issuer?: string }, sourceAmount: string, destAsset: { code: string; issuer?: string }) {
    try {
      const url = new URL(`${env.HORIZON_URL}/paths/strict-send`);
      url.searchParams.set('source_amount', sourceAmount);

      if (sourceAsset.code === 'XLM') {
        url.searchParams.set('source_asset_type', 'native');
      } else {
        url.searchParams.set('source_asset_type', 'credit_alphanum4');
        url.searchParams.set('source_asset_code', sourceAsset.code);
        url.searchParams.set('source_asset_issuer', sourceAsset.issuer!);
      }

      if (destAsset.code === 'XLM') {
        url.searchParams.set('destination_asset_type', 'native');
      } else {
        url.searchParams.set('destination_asset_type', 'credit_alphanum4');
        url.searchParams.set('destination_asset_code', destAsset.code);
        url.searchParams.set('destination_asset_issuer', destAsset.issuer!);
      }

      const { data } = await horizon.get(url.toString().replace(env.HORIZON_URL, ''));
      const best = data?._embedded?.records?.[0];
      return best ? { destAmount: best.destination_amount, path: best.path, raw: best } : undefined;
    } catch { return undefined; }
  }
}