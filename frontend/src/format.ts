export const percent = (value: number) => `${Math.round(value * 100)} %`;
export const number = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);
export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
export const duration = (seconds: number) =>
  seconds < 60
    ? `${seconds.toFixed(1).replace(".", ",")} s`
    : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
export const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const statusLabels = {
  queued: "En attente",
  processing: "En cours",
  completed: "Terminée",
  failed: "Échec",
  cancelled: "Interrompue",
} as const;
