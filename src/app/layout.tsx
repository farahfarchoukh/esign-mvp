import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CORE Cashless e-Sign",
  description: "E-signature workflow for CORE Cashless documents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              {/* CORE Cashless logo (downloaded to /public) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cc-logo.svg" alt="CORE Cashless" className="h-8 w-auto" />
              <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-sm font-semibold text-brand-blue">
                e-Sign
              </span>
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 text-center text-xs text-slate-500">
            Powered by <span className="font-semibold text-brand-blue">CORE</span>
            <span className="font-semibold text-brand-orange"> Cashless</span>
            <span className="mx-2 text-slate-300">·</span>
            <a href="/api-docs" className="hover:text-brand-blue hover:underline">
              API docs
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
