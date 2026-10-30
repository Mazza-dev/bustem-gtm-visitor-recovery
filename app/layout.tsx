import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bustem GTM 1",
  description: "Visitor capture, report tracking and follow-up demo.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
