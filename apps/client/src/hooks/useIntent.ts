// apps/client/src/hooks/useIntent.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createIntent, getIntent, patchIntent } from '../services/intents';
import type { CreateIntentInput } from '../types/intent';

export function useCreateIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateIntentInput) => createIntent(req),
    onSuccess: (res) => qc.setQueryData(['intent', res.id], res),
  });
}

export function useIntent(id?: string) {
  return useQuery({
    queryKey: ['intent', id],
    queryFn: () => getIntent(id as string),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function usePatchIntent(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string; tx?: Record<string, string> }) =>
      patchIntent(id as string, body as any),
    onSuccess: (res) => qc.setQueryData(['intent', res.id], res),
  });
}