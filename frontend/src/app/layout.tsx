import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AppProvider, Toast } from "@/components/app-context";
import { Modals } from "@/components/modals";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChoreShare",
  description: "Make shared chores fair — and a little more fun.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-[family-name:var(--font-sans)] text-[#1c2750]">
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 pt-16 sm:p-8 sm:pt-16 md:pt-8">
              {children}
            </main>
          </div>
          <Modals />
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
