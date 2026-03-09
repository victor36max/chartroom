import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chartroom",
  description: "AI-powered chart generation from CSV data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
