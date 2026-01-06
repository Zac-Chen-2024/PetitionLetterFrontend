import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetitionLetter - L-1 Visa Evidence Analyzer",
  description: "AI-powered L-1 Visa Evidence Analysis and Paragraph Generation Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
