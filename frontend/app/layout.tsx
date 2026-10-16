import type { Metadata } from "next";
import { Montserrat, Lora } from "next/font/google";
import "./globals.css";
import { topic } from "@/lib/topic";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// No title here: each view sets its own (components/DocumentTitle.tsx). A layout title
// would appear in the head next to it and win in the browser tab.
export const metadata: Metadata = {
  description: topic.appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${lora.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
