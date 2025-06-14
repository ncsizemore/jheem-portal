import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AppViewManager from "@/components/AppViewManager"; // Import the new component
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
        <header className="bg-gray-800 text-white p-4">
          <nav className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              JHEEM Portal
            </Link>
            <div className="space-x-4">
              <Link href="/prerun" className="hover:text-gray-300">
                Prerun Scenarios
              </Link>
              <Link href="/custom" className="hover:text-gray-300">
                Custom Simulations
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex flex-col flex-grow min-h-0"> {/* Removed container, mx-auto, p-4 */}
          <AppViewManager>{children}</AppViewManager>
        </main>
      </body>
    </html>
  );
}
