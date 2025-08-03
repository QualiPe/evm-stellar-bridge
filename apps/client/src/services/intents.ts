import { api } from '../api';
import type { CreateIntentInput, Intent } from '../types/intent';

// POST /intents — создаёт и возвращает Intent
export async function createIntent(req: CreateIntentInput): Promise<Intent> {
  const { data } = await api.post<Intent>('/intents', req);
  return data;
}

// GET /intents/:id — получить по id
export async function getIntent(id: string): Promise<Intent> {
  const { data } = await api.get<Intent>(`/intents/${id}`);
  return data;
}

// PATCH /intents/:id/status — обновить статус/tx
export async function patchIntent(
  id: string,
  body: { status: Intent['status']; tx?: Record<string, string> }
): Promise<Intent> {
  const { data } = await api.patch<Intent>(`/intents/${id}/status`, body);
  return data;
}