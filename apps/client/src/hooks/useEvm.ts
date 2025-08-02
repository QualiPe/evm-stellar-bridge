import { useAccount, usePublicClient, useConnectorClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, parseAbi, decodeEventLog } from 'viem';
import { cfg } from '../config';
import type { Intent } from '../types/intent';
import { parseUnits } from '../utils/units';

const htlcAbi = parseAbi([
  'event Funded(bytes32 indexed swapId,address indexed sender,address indexed recipient,uint256 amount,bytes32 hashlock,uint256 timelock)',
  'function fund(address recipient,uint256 amount,bytes32 hashlock,uint256 timelock) external',
]);

export function useEvm() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useConnectorClient();
  const { writeContractAsync } = useWriteContract();
  const { data: transactionReceipt, isSuccess } = useWaitForTransactionReceipt();

  function assertReady() {
    if (!address) throw new Error('Connect EVM wallet first');
    if (!publicClient || !walletClient) throw new Error('Wallet client not ready');
  }

  async function lockUsdcOnEvm(intent: Intent) {
    assertReady();

    const usdcHuman = intent.plan.summary?.bridge.evmUSDC.human ?? intent.plan.minLock.evm;
    if (!usdcHuman) throw new Error('No USDC amount in plan');
    const amount = parseUnits(usdcHuman, 6);

    const hashlock = intent.plan.hash as `0x${string}`;
    const timelock = BigInt(Math.floor(Date.now() / 1000) + intent.plan.timelocks.ethSec);

    const recipient = cfg.evm.counterparty;

    const usdc = cfg.evm.usdc as `0x${string}`;
    const htlc = cfg.evm.htlc as `0x${string}`;

    const allowance = (await publicClient!.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address!, htlc],
    })) as bigint;

    if (allowance < amount) {
      await writeContractAsync({
        address: usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [htlc, amount],
      });
      // Wait for approval transaction
      await new Promise(resolve => {
        const checkReceipt = () => {
          if (isSuccess) resolve(undefined);
          else setTimeout(checkReceipt, 1000);
        };
        checkReceipt();
      });
    }

    const lockHash = await writeContractAsync({
      address: htlc,
      abi: htlcAbi,
      functionName: 'fund',
      args: [recipient, amount, hashlock, timelock],
    });

    // Wait for lock transaction
    await new Promise(resolve => {
      const checkReceipt = () => {
        if (isSuccess) resolve(undefined);
        else setTimeout(checkReceipt, 1000);
      };
      checkReceipt();
    });

    let swapId: `0x${string}` | undefined;
    if (transactionReceipt) {
      for (const log of transactionReceipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: htlcAbi,
            topics: log.topics,
            data: log.data,
          });
          if (parsed.eventName === 'Funded') {
            swapId = parsed.args.swapId as `0x${string}`;
            break;
          }
        } catch {}
      }
    }

    return { lockHash, swapId };
  }

  return { lockUsdcOnEvm };
}