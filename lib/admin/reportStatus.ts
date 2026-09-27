// The statuses the admin can choose from. Your mobile app already writes a
// status when a report is created — check which value reportService.ts uses
// as the default (e.g. "open" or "pending") and make sure it's in this list.
export const REPORT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

/** Statuses that count as "needs attention" for the nav badge. */
export const ACTIVE_STATUSES: string[] = ["open", "in_progress", "pending"];

const LABELS: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export type StatusTone = "red" | "amber" | "green" | "gray";

const TONES: Record<string, StatusTone> = {
  open: "red",
  pending: "red",
  in_progress: "amber",
  resolved: "green",
  closed: "gray",
};

/** Works for unknown values too, so an unexpected status still displays sensibly. */
export function statusLabel(status: string): string {
  if (LABELS[status]) return LABELS[status];
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? "gray";
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
