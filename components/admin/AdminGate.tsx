"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getSignedInUserId, isCurrentUserAdmin } from "@/lib/admin/adminService";
import { emptyStyle } from "./styles";

type GateState = "checking" | "admin" | "denied" | "signed-out";

/**
 * Renders its children only for signed-in admins (profiles.role = 'admin').
 * This controls what the page shows; the real protection is RLS and the
 * is_admin() checks inside the SQL functions.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<GateState>("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      const userId = await getSignedInUserId();
      if (!active) return;
      if (!userId) return setGate("signed-out");
      const admin = await isCurrentUserAdmin();
      if (active) setGate(admin ? "admin" : "denied");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (gate === "admin") {
    return <>{children}</>;
  }

  if (gate === "checking") {
    return <p style={emptyStyle}>Checking your access…</p>;
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
      {gate === "signed-out" && (
        <>
          <div className="card-title" style={{ marginBottom: 6 }}>
            Sign in to continue
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
            Use your Bigkas admin account.
          </p>
          <Link href="/login" className="btn primary">
            Sign in
          </Link>
        </>
      )}

      {gate === "denied" && (
        <>
          <div className="card-title" style={{ marginBottom: 6 }}>
            No admin access
          </div>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            This account isn&apos;t an admin. Set <code>profiles.role</code> to{" "}
            <code>admin</code> for it in Supabase, or sign in with a different account.
          </p>
        </>
      )}
    </div>
  );
}
