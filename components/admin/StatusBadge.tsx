import { statusLabel, statusTone } from "@/lib/admin/reportStatus";

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`pill pill-${statusTone(status)}`}>{statusLabel(status)}</span>;
}
