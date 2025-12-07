import { Nav } from '@/components/layout/nav'
import { SkipLink } from '@/components/ui/skip-link'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <SkipLink href="#main-content" />
      <Nav />
      <main
        id="main-content"
        className="flex-1 overflow-hidden pt-[92px] sm:pt-[88px]"
        tabIndex={-1}
      >
        <div className="h-full mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pb-2">
          <div className="h-full rounded-xl overflow-hidden border border-border/40 bg-card">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

