import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "StoryTime AI - Create Animated Stories with AI",
  description:
    "Transform your ideas into stunning animated videos with the power of artificial intelligence. Create, edit, and export professional animated stories in minutes.",
  keywords: ["AI", "animation", "storytelling", "video generation", "animated stories", "AI art"],
  authors: [{ name: "StoryTime AI" }],
  openGraph: {
    title: "StoryTime AI - Create Animated Stories with AI",
    description: "Transform your ideas into stunning animated videos with AI",
    type: "website",
    locale: "en_US",
    siteName: "StoryTime AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryTime AI - Create Animated Stories with AI",
    description: "Transform your ideas into stunning animated videos with AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8B5CF6" },
    { media: "(prefers-color-scheme: dark)", color: "#A78BFA" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
