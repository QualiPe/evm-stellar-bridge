const EVM_DECIMALS: Record<string, number> = {
  // normalized to lowercase
  ['0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'.toLowerCase()]: 6,  // USDC
  ['0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2'.toLowerCase()]: 18, // WETH
};

function evmDecimals(addr: string | undefined, def = 18): number {
  if (!addr) return def;
  return EVM_DECIMALS[addr.toLowerCase()] ?? def;
}

function extractOneInchToAmount(data: any): string | undefined {
  if (!data) return undefined;
  return data.toAmount || data.dstAmount || data.toTokenAmount;
}
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
      const amountMinor = humanToMinor(input.amountIn, evmDecimals(input.fromToken, 18));
      const q = await this.oneInchQuote(input.fromToken, USDC_EVM_MAINNET, amountMinor);
      const outUsdcMinor = extractOneInchToAmount(q) ?? '0';
      if (outUsdcMinor === '0') {
        console.warn('[resolver] 1inch quote returned zero toAmount; check API key or token decimals.');
      }
      const outUsdcHuman = minorToHuman(outUsdcMinor, 6);

      // (Stellar) Horizon strict-send: USDC -> toAsset
      const dest = parseStellarAsset(input.toToken);
      const hp = await this.strictSend({ code: 'USDC', issuer: env.STELLAR_USDC_ISSUER }, outUsdcHuman, dest);
      if (!hp?.destAmount) {
        console.warn('[resolver] Horizon returned no path; consider mainnet issuer or add liquidity.');
      }

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
      if (!hp?.destAmount) {
        // eslint-disable-next-line no-console
        console.warn('[resolver] Horizon returned no path; consider mainnet issuer or add liquidity.');
      }
      return {
        hash: '0x',
        timelocks,
        minLock: {
          stellar: applyHaircutHuman(outUsdcHuman, bps),
          evm: applyHaircutHuman(minorToHuman(extractOneInchToAmount(q) ?? '0', 18), bps),
        },
        evmLeg: { via: '1inch', from: 'USDC', to: input.toToken, toAmountMinor: extractOneInchToAmount(q), raw: q },
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

  private async strictSend(
    sourceAsset: { code: string; issuer?: string },
    sourceAmount: string,
    destAsset: { code: string; issuer?: string },
  ) {
    try {
      const params: Record<string, string> = {
        source_amount: sourceAmount,
        source_asset_type: sourceAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
      };

      if (sourceAsset.code !== 'XLM') {
        params.source_asset_code = sourceAsset.code;
        params.source_asset_issuer = sourceAsset.issuer!;
      }

      // IMPORTANT: strict-send expects `destination_assets` (comma-separated list)
      params.destination_assets =
        destAsset.code === 'XLM' ? 'native' : `${destAsset.code}:${destAsset.issuer}`;

      const { data } = await horizon.get('/paths/strict-send', { params });
      const best = data?._embedded?.records?.[0];
      if (!best) return undefined;
      return { destAmount: best.destination_amount, path: best.path, raw: best };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[resolver] strict-send failed', (e as any)?.message ?? e);
      return undefined;
    }
  }
}