import type { Metadata } from "next";
import "./globals.css";

const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='12' fill='%23254437'/%3E%3Cpath d='M20 8v24m8-18c0-3-3-5-8-5s-8 2-8 5 3 5 8 6 8 3 8 6-3 5-8 5-8-2-8-5' fill='none' stroke='%23d4ec87' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: "Simple Money Tracker",
  description: "A simple personal income, spending, and savings tracker.",
  icons: { icon },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
