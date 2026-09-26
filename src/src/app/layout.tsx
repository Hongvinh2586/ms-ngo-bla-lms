import type { Metadata } from "next";
import { Noto_Serif, Work_Sans } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const notoSerif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ms Ngo Bla — Student area",
  description: "Lessons, quizzes and progress for students of Ms Ngo Bla.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${workSans.variable}`}>
      <body className="min-h-screen bg-paper font-body text-ink antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
