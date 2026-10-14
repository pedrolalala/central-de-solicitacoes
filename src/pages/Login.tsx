import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError('Credenciais inválidas. Verifique e tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div
        className={cn(
          'w-full max-w-md space-y-6 p-8 md:p-10 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-10',
          'animate-fade-in',
        )}
      >
        <div className="text-center flex flex-col items-center">
          <img
            src="https://central-lucenera.pages.dev/assets/logotipo-verticalv1branco-0271a-C0G7jEpr.png"
            alt="Luce Nera"
            className="h-20 w-auto object-contain mb-4 drop-shadow-2xl"
          />
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground/90">
            Central de Solicitações
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Bugs e pedidos de alteração da equipe Lucenera
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail corporativo</Label>
            <Input
              id="email"
              type="email"
              placeholder="pedro@lucenera.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 px-4 bg-background/50 focus-visible:ring-primary"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 px-4 bg-background/50 focus-visible:ring-primary"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium mt-4 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Entrar no Sistema <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Ambiente seguro. Acesso restrito a colaboradores Lucenera®.
          </p>
        </div>
      </div>
    </div>
  )
}
