import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Link from "next/link";
import { NotificationBell }    from "@/components/notifications/NotificationBell";
import { MobileMenuServer }   from "@/components/nav/MobileMenuServer";
import { ThemeProvider }    from "@/components/providers/ThemeProvider";
import { ThemeToggle }      from "@/components/nav/ThemeToggle";
import { UserMenu }             from "@/components/nav/UserMenu";
import { ConditionalHeader }    from "@/components/nav/ConditionalHeader";
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
  title: {
    template: '%s – ComDept',
    default:  'ComDept – Gestion de la communication',
  },
  description: "Gestion du département de communication de l'église",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Barre de navigation globale — masquée sur /login */}
          <ConditionalHeader>
            <header className="sticky top-0 z-40 h-12 border-b bg-card/95 backdrop-blur-sm shadow-sm shrink-0">
              <div className="container mx-auto px-4 max-w-7xl h-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MobileMenuServer />
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 font-bold text-sm hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary shrink-0">
                      <span className="text-primary-foreground text-[11px] font-black tracking-tight">CD</span>
                    </div>
                    <span className="hidden sm:inline">ComDept</span>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <NotificationBell />
                  <UserMenu />
                </div>
              </div>
            </header>
          </ConditionalHeader>

          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
