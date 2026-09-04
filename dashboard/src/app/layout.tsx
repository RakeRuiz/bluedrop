import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Nunito: redondeada y muy legible en tamaños chicos/tablas — combina con el
// wordmark redondeado de la marca. Para cambiarla, solo edita esta importación.
const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Blue Drop",
  description: "Seguimiento de leads de Franco por WhatsApp",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-muted/40">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
