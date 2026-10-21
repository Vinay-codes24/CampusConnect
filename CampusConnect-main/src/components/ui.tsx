"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, Inbox, X } from "lucide-react";
import { initials } from "@/lib/client";

export function Avatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="spinner" />
      {label ? <span className="text-sm muted">{label}</span> : null}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon ?? <Inbox size={26} />}</div>
      <h3 className="empty-title">{title}</h3>
      {body ? <p className="empty-body">{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty" role="alert">
      <div className="empty-icon error-icon">
        <AlertCircle size={26} />
      </div>
      <h3 className="empty-title">Something went wrong</h3>
      <p className="empty-body">{message}</p>
      {onRetry ? (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="panel card-pad" aria-hidden="true">
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 999 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: "38%", height: 12, marginBottom: 7 }} />
          <div className="skeleton" style={{ width: "22%", height: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: "72%", height: 18, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: "100%", height: 12, marginBottom: 7 }} />
      <div className="skeleton" style={{ width: "88%", height: 12 }} />
    </div>
  );
}

/**
 * Accessible modal dialog: closes on Escape and on backdrop click, traps focus
 * inside the dialog while open, and restores focus to the trigger afterwards.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`dialog ${size === "sm" ? "dialog-sm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {title ? (
          <div className="dialog-head">
            <h2 id={labelledBy} style={{ fontSize: 17 }}>
              {title}
            </h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={19} />
            </button>
          </div>
        ) : null}
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
