import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://getchartroom.com"),
  title: {
    default: "Chartroom",
    template: "%s | Chartroom",
  },
  description:
    "Create beautiful charts from CSV data with AI. Upload your data, describe what you want, and get publication-ready Vega-Lite visualizations instantly.",
  keywords: [
    "chart generator",
    "CSV to chart",
    "AI charts",
    "Vega-Lite",
    "data visualization",
  ],
  authors: [{ name: "Chartroom" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Chartroom",
    description:
      "Create beautiful charts from CSV data with AI. Upload your data, describe what you want, and get publication-ready visualizations instantly.",
    url: "https://getchartroom.com",
    siteName: "Chartroom",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chartroom",
    description:
      "Create beautiful charts from CSV data with AI. Upload your data and get publication-ready visualizations instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Chartroom",
              url: "https://getchartroom.com",
              description:
                "Create beautiful charts from CSV data with AI. Upload your data, describe what you want, and get publication-ready Vega-Lite visualizations instantly.",
              applicationCategory: "DataVisualization",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
