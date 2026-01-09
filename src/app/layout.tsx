import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppViewManager from "@/components/AppViewManager";
import Navigation from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JHEEM Portal",
  description: "JHEEM Interactive Application Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Navigation />
        <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <AppViewManager>{children}</AppViewManager>
        </main>
      </body>
    </html>
  );
}
