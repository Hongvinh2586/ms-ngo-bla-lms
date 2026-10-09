import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import Header from "@/components/Header";
import ClickSound from "@/components/ClickSound";
import "./globals.css";

const notoSerif = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
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
        <ClickSound />
      </body>
    </html>
  );
}
