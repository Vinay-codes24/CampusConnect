"use client";

import { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { api, type ApiUser } from "@/lib/client";
import { useApp } from "@/components/providers";
import { DEPARTMENTS, YEARS, type PublicUser } from "@/lib/types";
import { Modal } from "@/components/ui";
import { FormError, PendingButton, SelectField, TextAreaField, TextField } from "@/components/account/fields";

type Draft = {
  name: string;
  username: string;
  bio: string;
  department: string;
  year: string;
  interests: string[];
};

/** Full-profile editor. Saves through PATCH /api/auth/me. */
export function EditProfileModal({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: PublicUser;
  onSaved: (user: ApiUser) => void;
}) {
  const { toast } = useApp();
  const [draft, setDraft] = useState<Draft>({
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
    department: profile.department ?? "",
    year: profile.year ?? "",
    interests: [...profile.interests],
  });
  const [errors, setErrors] = useState<{ name?: string; username?: string; bio?: string; interest?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const [interestDraft, setInterestDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      department: profile.department ?? "",
      year: profile.year ?? "",
      interests: [...profile.interests],
    });
    setErrors({});
    setServerError("");
    setInterestDraft("");
  }, [open, profile]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addInterest() {
    const value = interestDraft.trim();
    if (!value) return;
    if (draft.interests.length >= 8) {
      setErrors((e) => ({ ...e, interest: "You can list up to 8 interests." }));
      return;
    }
    if (draft.interests.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setErrors((e) => ({ ...e, interest: "That interest is already listed." }));
      return;
    }
    setErrors((e) => ({ ...e, interest: undefined }));
    set("interests", [...draft.interests, value]);
    setInterestDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (draft.name.trim().length < 2) next.name = "Please enter your full name (2 characters or more).";
    const username = draft.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) next.username = "Use at least 3 letters, numbers or underscores.";
    if (draft.bio.length > 400) next.bio = "Keep your bio to 400 characters or fewer.";
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    setServerError("");
    try {
      const res = await api<{ user: ApiUser }>("/api/auth/me", {
        method: "PATCH",
        json: {
          name: draft.name.trim(),
          username,
          department: draft.department,
          year: draft.year,
          bio: draft.bio.trim(),
          interests: draft.interests,
        },
      });
      onSaved(res.user);
      toast("Profile updated", "success");
      onClose();
    } catch (err) {
      const message = (err as Error).message;
      if (/username is taken/i.test(message)) setErrors((x) => ({ ...x, username: message }));
      else setServerError(message);
      toast(message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      size="md"
      labelledBy="edit-profile-title"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <PendingButton pending={pending} pendingLabel="Saving…" className="btn btn-primary" form="edit-profile-form">
            <Save size={16} /> Save changes
          </PendingButton>
        </>
      }
    >
      <form id="edit-profile-form" className="stack" onSubmit={submit} noValidate>
        <FormError message={serverError} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <TextField
            id="edit-name"
            label="Full name"
            value={draft.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            required
            maxLength={60}
            disabled={pending}
          />
          <TextField
            id="edit-username"
            label="Username"
            value={draft.username}
            onChange={(v) => set("username", v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            error={errors.username}
            hint="Letters, numbers and underscores · 3–24 characters"
            required
            maxLength={24}
            disabled={pending}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <SelectField
            id="edit-department"
            label="Department"
            value={draft.department}
            onChange={(v) => set("department", v)}
            disabled={pending}
            options={[{ value: "", label: "Not specified" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
          />
          <SelectField
            id="edit-year"
            label="Year of study"
            value={draft.year}
            onChange={(v) => set("year", v)}
            disabled={pending}
            options={[{ value: "", label: "Not specified" }, ...YEARS.map((y) => ({ value: y, label: y }))]}
          />
        </div>

        <TextAreaField
          id="edit-bio"
          label="Bio"
          value={draft.bio}
          onChange={(v) => set("bio", v)}
          error={errors.bio}
          hint="A short line about what you study, build or care about."
          rows={3}
          maxLength={400}
          disabled={pending}
        />

        <div className="field">
          <span className="label" id="edit-interests-label">
            Interests
          </span>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {draft.interests.length === 0 ? <span className="text-sm muted">No interests yet.</span> : null}
            {draft.interests.map((interest) => (
              <span key={interest} className="tag tag-muted" style={{ paddingRight: 4 }}>
                {interest}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove interest ${interest}`}
                  disabled={pending}
                  onClick={() => set("interests", draft.interests.filter((i) => i !== interest))}
                  style={{ width: 22, height: 22, color: "inherit" }}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <label className="sr-only" htmlFor="edit-interest-input">
              Add an interest
            </label>
            <input
              id="edit-interest-input"
              className="input"
              value={interestDraft}
              maxLength={30}
              placeholder="e.g. Web development"
              disabled={pending}
              onChange={(e) => setInterestDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInterest();
                }
              }}
            />
            <button type="button" className="btn btn-soft btn-sm" onClick={addInterest} disabled={!interestDraft.trim() || pending}>
              <Plus size={15} /> Add
            </button>
          </div>
          {errors.interest ? (
            <span className="text-sm" role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
              {errors.interest}
            </span>
          ) : (
            <span className="hint">Up to 8 interests.</span>
          )}
        </div>
      </form>
    </Modal>
  );
}
