import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KotoDin? | Prepaid meter advisor",
  description:
    "An auditable prepaid electricity balance, run-out forecast, recharge calculator, and habit comparison for Bangladesh households.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
