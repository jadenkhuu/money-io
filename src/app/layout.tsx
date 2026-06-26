import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { AppNav } from "./nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "money-io",
  description: "Personal income and spending tracker.",
  applicationName: "money-io",
  appleWebApp: {
    capable: true,
    title: "money-io",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-dvh bg-app-bg flex justify-center items-start overflow-hidden">
        <div className="app-column @container flex h-dvh flex-col bg-app-surface">
          <div className="flex-1 overflow-y-auto scrollbar-none">{children}</div>
          <AppNav />
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
