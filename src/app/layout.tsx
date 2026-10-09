import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StrideNex LMS — Learn, Grow, Achieve",
    template: "%s | StrideNex LMS",
  },
  description:
    "StrideNex is a modern Learning Management System offering structured courses, learning paths, live batches, and certifications to help you grow your skills.",
  keywords: ["LMS", "online learning", "courses", "e-learning", "StrideNex", "learning paths", "certifications"],
  authors: [{ name: "StrideNex" }],
  creator: "StrideNex Inc.",
  metadataBase: new URL("https://devlms.stridenex.ai"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "StrideNex LMS",
    title: "StrideNex LMS — Learn, Grow, Achieve",
    description:
      "Explore structured courses, learning paths, and certifications on StrideNex LMS.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrideNex LMS",
    description: "Modern e-learning platform by StrideNex.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-800">
        {children}
      </body>
    </html>
  );
}
