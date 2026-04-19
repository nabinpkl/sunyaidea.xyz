import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/web3-config";
import { Web3Provider } from "@/components/providers/web3-provider";
import { TopBar } from "@/components/layout/top-bar";
import { AppNav } from "@/components/layout/app-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Inter is the primary UI font. Its larger x-height and rounded terminals
// hold up better on dark backgrounds than Roboto, which rendered thin and
// washed out in our dark theme.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SunyaIdeas | Zero Knowledge Idea-saving App",
  description: "SunyaIdeas is a zero-knowledge idea saving app that prioritizes user privacy and security.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"))

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="h-screen overflow-hidden flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme={false}>
          <Web3Provider initialState={initialState}>
            <TopBar />
            <AppNav />
            <ScrollArea className="flex-1">
              <main className="max-w-6xl mx-auto px-6">
                {children}
              </main>
            </ScrollArea>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
