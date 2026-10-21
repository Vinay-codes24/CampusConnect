"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type ApiUser } from "@/lib/client";

export type Toast = { id: number; message: string; tone: "default" | "success" | "error" };

type AppState = {
  user: ApiUser | null;
  setUser: (u: ApiUser | null) => void;
  refreshUser: () => Promise<void>;
  unread: number;
  refreshNotifications: () => Promise<void>;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProviders>");
  return ctx;
}

type NotificationSummary = { unread: number };

export function AppProviders({ initialUser, children }: { initialUser: ApiUser | null; children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(initialUser);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<{ user: ApiUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const data = await api<NotificationSummary>("/api/notifications?summary=1");
      setUnread(data.unread);
    } catch {
      /* non-fatal */
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(refreshNotifications, 45_000);
    return () => window.clearInterval(id);
  }, [user, refreshNotifications]);

  const value = useMemo<AppState>(
    () => ({ user, setUser, refreshUser, unread, refreshNotifications, toasts, toast }),
    [user, refreshUser, unread, refreshNotifications, toasts, toast],
  );

  return (
    <AppContext.Provider value={value}>
      <div className="app-shell">{children}</div>
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone === "default" ? undefined : t.tone}>
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
