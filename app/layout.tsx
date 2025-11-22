import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { BugReporterWrapper } from "@/components/providers/BugReporterWrapper";
import { Toaster } from 'react-hot-toast';

// Professional font for entire application
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Keep Inter as backup
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JKKN Mentor",
  description: "Devloped by Roja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        <AuthProvider>
          <BugReporterWrapper>
            <ToastProvider>
              {children}
            </ToastProvider>
          </BugReporterWrapper>
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
