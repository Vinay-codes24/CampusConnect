import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { Header } from "@/components/header";
import { MainNav } from "@/components/main-nav";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "CampusConnect — your digital campus",
    template: "%s · CampusConnect",
  },
  description:
    "CampusConnect is a college social network, campus events board and academic dashboard in one place.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <AppProviders initialUser={user ? publicUser(user) : null}>
          <a href="#main-content" className="sr-only">
            Skip to main content
          </a>
          <Header />
          <MainNav />
          <main id="main-content" style={{ flex: 1, paddingBlock: 24 }}>
            {children}
          </main>
          <footer style={{ borderTop: "1px solid var(--color-ink-200)", background: "#fff", padding: "22px 0 30px", marginTop: 24 }}>
            <div className="container row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <strong>CampusConnect</strong>
                <span className="text-sm muted"> · JAC College</span>
                <div className="text-sm muted" style={{ marginTop: 4 }}>
                  A unified digital campus for students, clubs and faculty.
                </div>
              </div>
              <span className="demo-badge">Demo build · sample data only</span>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
