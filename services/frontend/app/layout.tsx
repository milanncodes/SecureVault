import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SecureVault | Legal DMS & Forensic Integrity Engine",
  description: "Zero-Trust, Zero-Pollution Legal Document Management System with Sec 65B Non-Repudiation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gh-bg text-gh-text antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
