import type { Analysis, Health, Model } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new Error(
      "L’API est inaccessible. Vérifiez que le serveur est lancé, puis réessayez.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : (detail?.message ??
          `Le serveur n’a pas pu traiter la demande (${response.status}).`),
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/health", { signal }),
  models: (signal?: AbortSignal) =>
    request<{ models: Model[]; default_model_id: string }>("/models", {
      signal,
    }),
  history: (signal?: AbortSignal, offset = 0) =>
    request<{ items: Analysis[]; total: number }>(
      `/analyses?limit=50&offset=${offset}`,
      { signal },
    ),
  analysis: (id: string, signal?: AbortSignal) =>
    request<Analysis>(`/analyses/${encodeURIComponent(id)}`, { signal }),
  cancel: (id: string) =>
    request<Analysis>(`/analyses/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),
  create: (
    file: File,
    model: string,
    confidence: number,
    signal?: AbortSignal,
  ) => {
    const body = new FormData();
    body.append("file", file);
    body.append("model_id", model);
    body.append("confidence", String(confidence));
    return request<Analysis>("/analyses", { method: "POST", body, signal });
  },
  exportUrl: (id: string, format: "json" | "csv") =>
    `/api/analyses/${encodeURIComponent(id)}/export?format=${format}`,
};
