import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { consumeCodeFromUrl } from '@/lib/cross-system-auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  hasAccess: boolean | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  // SPEC-121: mesmo padrão SPEC-069 já usado nos outros sistemas — checa
  // permissão granular do Hub (hub_pode_executar) pro sistema 'solicitacoes'
  // inteiro, sem módulo/ação específicos.
  useEffect(() => {
    if (!user?.id) {
      setHasAccess(null)
      return
    }
    supabase
      .rpc('hub_pode_executar', {
        p_usuario_id: user.id,
        p_system_slug: 'solicitacoes',
        p_modulo_chave: null,
        p_acao: null,
      })
      .then(({ data }) => setHasAccess(Boolean(data)))
  }, [user?.id])

  useEffect(() => {
    let mounted = true
    let initialized = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted || !initialized) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    consumeCodeFromUrl('solicitacoes')
      .catch(() => {})
      .finally(() => {
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
          if (!mounted) return
          initialized = true
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setLoading(false)
        })
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, hasAccess, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
