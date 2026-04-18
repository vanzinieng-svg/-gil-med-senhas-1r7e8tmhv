import { Outlet, useLocation, Link } from 'react-router-dom'
import { QueueProvider } from '@/stores/use-queue-store'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Layout() {
  const location = useLocation()
  const isIndex = location.pathname === '/'
  const isPrintable = location.pathname === '/totem'

  return (
    <QueueProvider>
      <main className="flex flex-col min-h-screen bg-background relative overflow-hidden">
        {/* Hidden navigation for easy return to dashboard during testing */}
        {!isIndex && (
          <div
            className={cn(
              'fixed top-4 right-4 z-50 transition-opacity',
              isPrintable && 'print:hidden',
            )}
          >
            <Button
              variant="outline"
              size="icon"
              asChild
              className="rounded-full shadow-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              <Link to="/" title="Voltar ao Menu Principal">
                <Home className="h-4 w-4 text-primary" />
              </Link>
            </Button>
          </div>
        )}

        <div className="flex-1 flex flex-col w-full h-full animate-fade-in">
          <Outlet />
        </div>
      </main>
    </QueueProvider>
  )
}
