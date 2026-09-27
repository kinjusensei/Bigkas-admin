"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveReportCount } from "@/lib/admin/adminService";

/**
 * Small count bubble for the sidebar's "Bug reports" link: how many reports
 * still need attention. Renders nothing when the count is 0.
 */
export default function ReportsCountBadge() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  // Re-count on navigation so it drops after a report is resolved.
  useEffect(() => {
    getActiveReportCount().then(setCount);
  }, [pathname]);

  if (count === 0) return null;

  return (
    <span className="sb-badge" aria-label={`${count} need attention`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
