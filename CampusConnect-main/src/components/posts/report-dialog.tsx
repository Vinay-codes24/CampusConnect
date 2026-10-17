"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { REPORT_REASONS, type ReportReason } from "@/lib/types";

/**
 * Report dialog for posts and comments.
 * Files a report that lands in the moderation queue at /admin?tab=reports.
 */
export function ReportDialog({
  open,
  onClose,
  target,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onClose: () => void;
  target: "post" | "comment";
  targetId: string;
  targetLabel: string;
}) {
  const { user, toast } = useApp();
  const [reason, setReason] = useState<ReportReason>("Spam");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!user) {
      toast("Sign in to report content.", "error");
      onClose();
      return;
    }
    setPending(true);
    try {
      await api("/api/reports", { method: "POST", json: { target, targetId, reason, details } });
      toast("Report submitted. A moderator will review it.", "success");
      setDetails("");
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Report content"
      labelledBy="report-dialog-title"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={submit} disabled={pending}>
            {pending ? <span className="spinner" /> : <Flag size={15} />}
            Submit report
          </button>
        </>
      }
    >
      <p className="text-sm muted" style={{ marginBottom: 14 }}>
        Reporting <strong>{targetLabel}</strong>. Reports are private and reviewed by faculty or an administrator.
      </p>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 8 }}>
          Why are you reporting this?
        </legend>
        <div className="stack" style={{ gap: 8 }}>
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className="row"
              style={{
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${reason === r ? "var(--color-brand-400)" : "var(--color-ink-200)"}`,
                background: reason === r ? "var(--color-brand-50)" : "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="label" htmlFor="report-details">
          Anything else? (optional)
        </label>
        <textarea
          id="report-details"
          className="textarea"
          style={{ minHeight: 84 }}
          maxLength={500}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add context that will help the moderator decide."
        />
        <span className="hint">{details.length}/500 characters</span>
      </div>
    </Modal>
  );
}
