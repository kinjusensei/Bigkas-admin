"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  cardUnderTabsStyle,
  emptyStyle,
  leadStyle,
  tabBarStyle,
  tabStyle,
} from "@/components/admin/styles";
import { BugReport, errorMessage, getBugReports } from "@/lib/admin/adminService";
import { REPORT_STATUSES, statusLabel, timeAgo } from "@/lib/admin/reportStatus";

export default function ReportsPage() {
  return (
    <AdminGate>
      <ReportsContent />
    </AdminGate>
  );
}

function ReportsContent() {
  const [filter, setFilter] = useState<string>("all");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await getBugReports(filter === "all" ? undefined : filter));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Couldn't load reports."));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const filters = ["all", ...REPORT_STATUSES];

  return (
    <>
      <p style={leadStyle}>
        Open a report to see the screenshot, reply to the user, and update its status.
      </p>

      <div style={tabBarStyle} role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={tabStyle(filter === f)}
            aria-pressed={filter === f}
          >
            {f === "all" ? "All" : statusLabel(f)}
          </button>
        ))}
      </div>

      <div className="card" style={cardUnderTabsStyle}>
        {error ? (
          <p className="flash flash-error">{error}</p>
        ) : loading ? (
          <p style={emptyStyle}>Loading…</p>
        ) : reports.length === 0 ? (
          <p style={emptyStyle}>
            {filter === "all"
              ? "No bug reports yet."
              : `No reports marked ${statusLabel(filter).toLowerCase()}.`}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: "#111827" }}>{r.title}</td>
                    <td>{r.category}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ color: "#9CA3AF" }}>{timeAgo(r.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/dashboard/reports/${r.id}`} className="btn sm">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
