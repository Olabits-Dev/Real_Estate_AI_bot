import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olabits Estate bot",
  description:
    "AI-powered real estate chatbot for lead capture, listing discovery, and WhatsApp routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
