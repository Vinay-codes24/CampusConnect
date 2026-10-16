"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/** Global error boundary — keeps a crash from taking down the whole session. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[campusconnect]", error);
  }, [error]);

  return (
    <div className="container">
      <div className="panel card-pad" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", padding: 40 }}>
        <div className="empty-icon" style={{ background: "#fef2f2", color: "#b91c1c" }} aria-hidden="true">
          !
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          An unexpected error occurred. Your data is safe — try again, and report the problem if it keeps happening.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    </div>
  );
}
