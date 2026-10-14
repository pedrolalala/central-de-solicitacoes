import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Painel from './pages/Painel'
import NovoPedido from './pages/NovoPedido'
import DetalheSolicitacao from './pages/DetalheSolicitacao'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './hooks/use-auth'

const ProtectedRoutes = () => {
  const { user, hasAccess, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return <Login />

  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta não tem permissão para acessar a Central de Solicitações. Fale com um
            administrador se acredita que isso é um engano.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Painel />} />
        <Route path="/novo" element={<NovoPedido />} />
        <Route path="/pedido/:id" element={<DetalheSolicitacao />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ProtectedRoutes />
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
