import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { Toaster } from "sonner";
import { NotificationBell }    from "@/components/notifications/NotificationBell";
import { ThemeProvider }       from "@/components/providers/ThemeProvider";
import { ThemeToggle }         from "@/components/nav/ThemeToggle";
import { UserMenu }            from "@/components/nav/UserMenu";
import { AppShell }            from "@/components/nav/AppShell";
import { getModulesAccessibles, getMyRole } from "@/lib/dashboard/modules-access";
import { ROLES_ADMIN }         from "@/lib/auth/guards";
import type { AppRole }        from "@/lib/supabase/types";
import "./globals.css";

// Police de titrage : Jost, équivalent libre de Futura (charte graphique)
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: '%s – ComDept Horeb',
    default:  'ComDept – Horeb Cité SIR',
  },
  description: "Comité de communication de l'Église Méthodiste Horeb Cité SIR",
  applicationName: 'ComDept Horeb',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfcf8' },
    { media: '(prefers-color-scheme: dark)',  color: '#0e120d' },
  ],
};

async function getContexteNavigation() {
  try {
    const [modulesAccessibles, role] = await Promise.all([getModulesAccessibles(), getMyRole()])
    return { modulesAccessibles, estAdmin: ROLES_ADMIN.includes(role as AppRole) }
  } catch {
    // Supabase non configuré (développement) : navigation minimale
    return { modulesAccessibles: [] as string[], estAdmin: false }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { modulesAccessibles, estAdmin } = await getContexteNavigation()

  return (
    <html
      lang="fr"
      className={`${jost.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell
            modulesAccessibles={modulesAccessibles}
            estAdmin={estAdmin}
            actions={
              <>
                <ThemeToggle />
                <NotificationBell />
                <UserMenu />
              </>
            }
          >
            {children}
          </AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
