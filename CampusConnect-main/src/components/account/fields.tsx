"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

/**
 * Form primitives shared by the auth, profile and settings surfaces.
 * Every field renders a real <label>, wires `aria-invalid` and an
 * `aria-describedby` hint/error, and shows inline error text.
 */

export type FieldBase = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
};

function hintId(id: string) {
  return `${id}-hint`;
}

function errorId(id: string) {
  return `${id}-error`;
}

function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return errorId(id);
  if (hint) return hintId(id);
  return undefined;
}

function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span className="hint" id={hintId(id)}>
      {children}
    </span>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span className="text-sm" id={errorId(id)} role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
      {message}
    </span>
  );
}

export function TextField(
  props: FieldBase & {
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    inputMode?: "text" | "email" | "numeric" | "search";
  },
) {
  const { id, label, value, onChange, error, hint, type = "text", placeholder, autoComplete, disabled, required, maxLength, inputMode } = props;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "#b91c1c" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <input
        className="input"
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
      {error ? null : hint ? (
        <Hint id={id}>{hint}</Hint>
      ) : null}
      <ErrorText id={id} message={error} />
    </div>
  );
}

export function PasswordField(
  props: FieldBase & {
    autoComplete?: string;
    placeholder?: string;
    showToggle?: boolean;
  },
) {
  const { id, label, value, onChange, error, hint, autoComplete, placeholder, disabled, required, maxLength, showToggle = true } = props;
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "#b91c1c" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          style={showToggle ? { paddingRight: 44 } : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
        />
        {showToggle ? (
          <button
            type="button"
            className="icon-btn"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            style={{ position: "absolute", right: 3, top: "50%", transform: "translateY(-50%)", width: 34, height: 34 }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>
      {error ? null : hint ? (
        <Hint id={id}>{hint}</Hint>
      ) : null}
      <ErrorText id={id} message={error} />
    </div>
  );
}

export function TextAreaField(
  props: FieldBase & {
    placeholder?: string;
    rows?: number;
  },
) {
  const { id, label, value, onChange, error, hint, placeholder, disabled, required, maxLength, rows = 4 } = props;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "#b91c1c" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <textarea
        className="textarea"
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
      {maxLength != null ? (
        <span className="hint" style={{ alignSelf: "flex-end" }}>
          {value.length}/{maxLength}
        </span>
      ) : null}
      {error ? null : hint ? (
        <Hint id={id}>{hint}</Hint>
      ) : null}
      <ErrorText id={id} message={error} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  disabled,
  required,
}: FieldBase & {
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "#b91c1c" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <select
        className="select"
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? null : hint ? (
        <Hint id={id}>{hint}</Hint>
      ) : null}
      <ErrorText id={id} message={error} />
    </div>
  );
}

/** Server-side error banner for a form. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="row"
      style={{
        gap: 9,
        padding: "10px 12px",
        borderRadius: 12,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        fontSize: 14,
        fontWeight: 600,
        alignItems: "flex-start",
      }}
    >
      <AlertCircle size={17} style={{ flex: "none", marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

/** Submit button that disables itself and shows a spinner while pending. */
export function PendingButton({
  pending,
  pendingLabel,
  children,
  className = "btn btn-primary",
  type = "submit",
  disabled,
  style,
  form,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Associates a submit button with a form it is rendered outside of. */
  form?: string;
}) {
  return (
    <button type={type} form={form} className={className} disabled={disabled || pending} aria-busy={pending} style={style}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
