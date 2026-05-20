import type { Metadata, Viewport } from "next";
import { CapacitorBackButtonHandler } from "@/components/capacitor-back-button-handler";
import { PwaRegistration } from "@/components/pwa-registration";
import { getConfiguredAppUrl } from "@/lib/env";
import "./globals.css";

const metadataBase = new URL(getConfiguredAppUrl() ?? "https://app.pikesvillembb.com");

export const metadata: Metadata = {
  metadataBase,
  title: "Pikesville MBB App",
  description: "Live basketball workflow, scouting, assignments, practices, and reporting.",
  manifest: "/manifest.webmanifest?v=20260425",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pikesville MBB",
  },
  icons: {
    icon: [
      { url: "/branding/pikesville-panthers-logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/branding/pikesville-panthers-logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/branding/pikesville-panthers-logo-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#16202d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistration />
        <CapacitorBackButtonHandler />
        {children}
      </body>
    </html>
  );
}
