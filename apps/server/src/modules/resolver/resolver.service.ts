import { Injectable } from '@nestjs/common';
import { ENV as env } from '../../shared/config.module';
import { oneInch, horizon } from './clients';
import { CreateIntentInput, IntentPlan } from '../../shared/types';
import { USDC_EVM_MAINNET, parseStellarAsset } from '../../shared/constants';
import { humanToMinor, minorToHuman, applyHaircutHuman, applyHaircutUpHuman } from '../../shared/amount';

const EVM_DECIMALS: Record<string, number> = {
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

@Injectable()
export class ResolverService {
  async buildPlan(input: CreateIntentInput): Promise<IntentPlan> {
    const timelocks = { ethSec: 60 * 60, stellarSec: 40 * 60 };
    const bps = env.MIN_HAIRCUT_BPS;
    const mode = (input.mode ?? 'EXACT_IN') as 'EXACT_IN' | 'EXACT_OUT';
    const quoteTtlSec = 30;

    if (input.direction === 'EVM_TO_STELLAR') {
      if (mode === 'EXACT_IN') {
        if (!input.amountIn) throw new Error('amountIn is required when mode = EXACT_IN');

        // 1) EVM: WETH -> USDC
        const amountMinor = humanToMinor(input.amountIn!, evmDecimals(input.fromToken, 18));
        const q = await this.oneInchQuote(input.fromToken, USDC_EVM_MAINNET, amountMinor);
        const outUsdcMinor = extractOneInchToAmount(q)!;
        const outUsdcHuman = minorToHuman(outUsdcMinor, 6);

        // 2) Stellar: USDC -> XLM (for UI preview)
        const dest = parseStellarAsset(input.toToken); // e.g. XLM
        const hp = await this.strictSend({ code: 'USDC', issuer: env.STELLAR_USDC_ISSUER }, outUsdcHuman, dest);

        // 3) Locks — always USDC on both legs
        const minLockUsdc = applyHaircutHuman(outUsdcHuman, bps);

        return {
          hash: '0x',
          timelocks,
          minLock: { evm: minLockUsdc, stellar: minLockUsdc },
          evmLeg: { via: '1inch', from: input.fromToken, to: 'USDC', toAmountMinor: outUsdcMinor, raw: q },
          stellarLeg: { via: 'strict-send', destAmount: hp?.destAmount, path: hp?.path, raw: hp },
          mode,
          summary: {
            mode,
            src: { chain: 'EVM', token: 'WETH', decimals: 18, amountHuman: input.amountIn },
            bridge: {
              evmUSDC: { human: outUsdcHuman, minor: outUsdcMinor, decimals: 6 },
              stellarUSDC: { human: outUsdcHuman, decimals: 7 },
            },
            dst: { chain: 'Stellar', token: dest.code, decimals: dest.code === 'XLM' ? 7 : 7, amountHuman: hp?.destAmount ?? '0' },
            quoteTtlSec,
          },
        };
      } else {
        // EXACT_OUT: user specifies desired XLM on Stellar
        if (!input.amountOut) throw new Error('amountOut is required when mode = EXACT_OUT');

        const dest = parseStellarAsset(input.toToken); // e.g. XLM
        // 1) How much USDC on Stellar needed to deliver amountOut?
        let usdcOnStellarHuman = '0';
        if (dest.code === 'USDC' && dest.issuer === env.STELLAR_USDC_ISSUER) {
          usdcOnStellarHuman = applyHaircutUpHuman(input.amountOut, bps);
        } else {
          const sr = await this.strictReceive(dest, input.amountOut, `USDC:${env.STELLAR_USDC_ISSUER}`);
          if (!sr?.sourceAmount) throw new Error('Horizon returned no path for strict-receive');
          usdcOnStellarHuman = applyHaircutUpHuman(sr.sourceAmount, bps);
        }

        // 2) How much WETH on EVM needed to get that many USDC?
        const targetUsdcMinor = humanToMinor(usdcOnStellarHuman, 6);
        const needInMinor = await this.oneInchFindAmountIn(input.fromToken, USDC_EVM_MAINNET, targetUsdcMinor);
        const needInHuman = minorToHuman(needInMinor, evmDecimals(input.fromToken, 18));

        const minLockUsdc = usdcOnStellarHuman; // haircut-up already applied

        return {
          hash: '0x',
          timelocks,
          minLock: { evm: minLockUsdc, stellar: minLockUsdc },
          evmLeg: { via: '1inch', from: input.fromToken, to: 'USDC', toAmountMinor: targetUsdcMinor, raw: { target: true } },
          stellarLeg: { via: 'strict-receive', sourceAmount: usdcOnStellarHuman, path: [], raw: { target: true } },
          mode,
          amountOut: input.amountOut,
          amountInEstimated: needInHuman,
          summary: {
            mode,
            src: { chain: 'EVM', token: 'WETH', decimals: 18, amountHuman: needInHuman },
            bridge: {
              evmUSDC: { human: usdcOnStellarHuman, minor: targetUsdcMinor, decimals: 6 },
              stellarUSDC: { human: usdcOnStellarHuman, decimals: 7 },
            },
            dst: { chain: 'Stellar', token: dest.code, decimals: dest.code === 'XLM' ? 7 : 7, amountHuman: input.amountOut },
            quoteTtlSec,
          },
        };
      }
    } else {
      // ---------- STELLAR_TO_EVM ----------
      if (mode === 'EXACT_IN') {
        if (!input.amountIn) throw new Error('amountIn is required when mode = EXACT_IN');

        // 1) Stellar: fromToken -> USDC (how many USDC we get)
        const src = parseStellarAsset(input.fromToken); // e.g. USDC:GA5Z...
        const hp = await this.strictSend(src, input.amountIn!, { code: 'USDC', issuer: env.STELLAR_USDC_ISSUER });
        const outUsdcHuman = hp?.destAmount ?? '0';
        const outUsdcMinor = humanToMinor(outUsdcHuman, 6);

        // 2) EVM: USDC -> WETH (for UI preview)
        const q = await this.oneInchQuote(USDC_EVM_MAINNET, input.toToken, outUsdcMinor);

        // 3) Locks — always USDC on both legs
        const minLockUsdc = applyHaircutHuman(outUsdcHuman, bps);

        return {
          hash: '0x',
          timelocks,
          minLock: { stellar: minLockUsdc, evm: minLockUsdc },
          evmLeg: { via: '1inch', from: 'USDC', to: input.toToken, toAmountMinor: extractOneInchToAmount(q), raw: q },
          stellarLeg: { via: 'strict-send', destAmount: outUsdcHuman, path: hp?.path, raw: hp },
          mode,
          summary: {
            mode,
            src: { chain: 'Stellar', token: src.code, decimals: 7, amountHuman: input.amountIn },
            bridge: {
              evmUSDC: { human: outUsdcHuman, minor: outUsdcMinor, decimals: 6 },
              stellarUSDC: { human: outUsdcHuman, decimals: 7 },
            },
            dst: { chain: 'EVM', token: 'WETH', decimals: 18, amountHuman: extractOneInchToAmount(q) ? minorToHuman(extractOneInchToAmount(q)!, 18) : '0' },
            quoteTtlSec,
          },
        };
      } else {
        // EXACT_OUT: user specifies desired WETH on EVM
        if (!input.amountOut) throw new Error('amountOut is required when mode = EXACT_OUT');

        // 1) EVM: how many tokens are required to get amountOut WETH
        const outMinor = humanToMinor(input.amountOut, evmDecimals(input.toToken, 18));
        const needUsdcMinor = await this.oneInchFindAmountIn(USDC_EVM_MAINNET, input.toToken, outMinor);
        const needUsdcHuman = minorToHuman(needUsdcMinor, 6);

        // 2) Locks — haircut-up on both legs
        const minLockUsdc = applyHaircutUpHuman(needUsdcHuman, bps);
        const src = parseStellarAsset(input.fromToken);
        const sourceCsv = src.code === 'XLM' ? 'native' : `${src.code}:${src.issuer}`;

        const sr = await this.strictReceive(
          { code: 'USDC', issuer: env.STELLAR_USDC_ISSUER },
          minLockUsdc,
          sourceCsv,
        );
        if (!sr?.sourceAmount) throw new Error('Horizon returned no path for strict-receive');

        return {
          hash: '0x',
          timelocks,
          minLock: { stellar: minLockUsdc, evm: minLockUsdc },
          evmLeg: { via: '1inch', from: 'USDC', to: input.toToken, toAmountMinor: outMinor, raw: { target: true } },
          stellarLeg: { via: 'strict-receive', sourceAmount: sr.sourceAmount, path: sr.path, raw: sr },
          amountOut: input.amountOut,
          amountInEstimated: sr.sourceAmount,
          summary: {
            mode,
            src: { chain: 'Stellar', token: src.code, decimals: 7, amountHuman: sr.sourceAmount },
            bridge: {
              evmUSDC:     { human: minLockUsdc, minor: needUsdcMinor, decimals: 6 },
              stellarUSDC: { human: minLockUsdc, decimals: 7 },
            },
            dst: { chain: 'EVM', token: 'WETH', decimals: 18, amountHuman: input.amountOut },
            quoteTtlSec,
          },
        };
      }
    }
  }

  private async oneInchQuote(from: string, to: string, amountMinor: string) {
    try {
      // Modern v6.1 params
      const { data } = await oneInch.get('/quote', {
        params: { src: from, dst: to, amount: amountMinor },
      });
      const toAmt = extractOneInchToAmount(data);
      if (!toAmt || toAmt === '0') throw new Error('empty toAmount');
      return data;
    } catch {
      // Legacy fallback
      const { data } = await oneInch.get('/quote', {
        params: { fromTokenAddress: from, toTokenAddress: to, amount: amountMinor },
      });
      const toAmt = extractOneInchToAmount(data);
      if (!toAmt || toAmt === '0') throw new Error('empty toAmount (legacy)');
      return data;
    }
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
        destination_assets: destAsset.code === 'XLM' ? 'native' : `${destAsset.code}:${destAsset.issuer}`,
      };
      if (sourceAsset.code !== 'XLM') {
        params.source_asset_code = sourceAsset.code;
        params.source_asset_issuer = sourceAsset.issuer!;
      }
      const { data } = await horizon.get('/paths/strict-send', { params });
      const best = data?._embedded?.records?.[0];
      if (!best) return undefined;
      return { destAmount: best.destination_amount, path: best.path, raw: best };
    } catch (e) {
      console.warn('[resolver] strict-send failed', (e as any)?.message ?? e);
      return undefined;
    }
  }

  private async strictReceive(
    destAsset: { code: string; issuer?: string },
    destAmount: string,
    sourceAssetsCsv: string,
  ) {
    try {
      const params: Record<string, string> = { destination_amount: destAmount, source_assets: sourceAssetsCsv };
      if (destAsset.code === 'XLM') {
        params.destination_asset_type = 'native';
      } else {
        params.destination_asset_type = 'credit_alphanum4';
        params.destination_asset_code = destAsset.code;
        params.destination_asset_issuer = destAsset.issuer!;
      }
      const { data } = await horizon.get('/paths/strict-receive', { params });
      const best = data?._embedded?.records?.[0];
      if (!best) return undefined;
      return { sourceAmount: best.source_amount, path: best.path, raw: best };
    } catch (e) {
      console.warn('[resolver] strict-receive failed', (e as any)?.message ?? e);
      return undefined;
    }
  }

  private async oneInchFindAmountIn(
    from: string,
    to: string,
    targetOutMinor: string,
    maxRounds = 8,
  ): Promise<string> {
    const target = BigInt(targetOutMinor || '0');
    if (target <= 0n) return '0';

    let low = 0n;
    const fromDec = evmDecimals(from, 18);
    let high = 10n ** BigInt(fromDec);
    let covered = false;

    for (let i = 0; i < maxRounds * 4; i++) {
      const q = await this.oneInchQuote(from, to, high.toString());
      const out = extractOneInchToAmount(q);
      const outBI = out ? BigInt(out) : 0n;
    
      if (outBI >= target) {
        covered = true;
        break;
      }
      low = high;
      high *= 2n;
    }
    
    if (!covered) {
      throw new Error('1inch quote did not reach target within search bounds');
    }

    // Expand upper bound
    for (let i = 0; i < maxRounds; i++) {
      const q = await this.oneInchQuote(from, to, high.toString());
      const out = extractOneInchToAmount(q);
      const outBI = out ? BigInt(out) : 0n;
      if (outBI > 0n) covered = true;
      if (outBI >= target) break;
      high = high * 2n;
    }
    if (!covered) {
      throw new Error('1inch quote returned 0 for all attempts (check API key/liquidity/addresses)');
    }

    // Binary search
    for (let i = 0; i < maxRounds * 2; i++) {
      const mid = (low + high) / 2n;
      const q = await this.oneInchQuote(from, to, mid.toString());
      const out = extractOneInchToAmount(q);
      const outBI = out ? BigInt(out) : 0n;
      if (outBI >= target) high = mid; else low = mid;
      if (high - low <= 1n) break;
    }
    return high.toString();
  }
}