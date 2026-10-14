import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { SystemSwitcher } from './SystemSwitcher'

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-[1200px]">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://central-lucenera.pages.dev/assets/logotipo-verticalv1branco-0271a-C0G7jEpr.png"
              alt="Luce Nera"
              className="h-9 w-auto object-contain"
            />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <span className="font-display font-medium text-base sm:text-lg text-foreground/90">
              Central de Solicitações
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-primary"
            >
              <a
                href="https://central-lucenera.pages.dev/dashboard"
                title="Voltar para a Central Lucenera"
              >
                <Home className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Central</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground border-border"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <SystemSwitcher currentSlug="solicitacoes" />
    </div>
  )
}
