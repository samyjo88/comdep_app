import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="flex-1 bg-muted/30">{children}</main>
}
