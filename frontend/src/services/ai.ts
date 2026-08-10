import { api } from "./api";

export interface AIMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatResponse {
  conversation_id: number;
  message: AIMessage;
  provider: "gemini" | "openai" | "fallback";
  insights: string[];
}

export async function sendChat(
  message: string,
  opts?: { conversation_id?: number | null; period?: string; workspace?: number }
) {
  const { data } = await api.post<ChatResponse>("/ai/chat/", {
    message,
    conversation_id: opts?.conversation_id,
    period: opts?.period || "30D",
  }, {
    params: opts?.workspace ? { workspace: opts.workspace } : undefined,
  });
  return data;
}

export async function fetchInsights(period = "30D", workspaceId?: number) {
  const { data } = await api.get<{ insights: string[] }>("/ai/insights/", {
    params: { period, workspace: workspaceId },
  });
  return data;
}

export async function listConversations(workspaceId?: number) {
  const { data } = await api.get<
    { id: number; title: string; created_at: string; updated_at: string }[]
  >("/ai/conversations/", {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function getConversation(id: number, workspaceId?: number) {
  const { data } = await api.get<{
    id: number;
    title: string;
    messages: AIMessage[];
  }>(`/ai/conversations/${id}/`, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}
