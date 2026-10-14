import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bug, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import {
  buscarSolicitacao,
  atualizarStatus,
  Solicitacao,
  StatusSolicitacao,
} from '@/services/solicitacoes'

const STATUS_LABEL: Record<StatusSolicitacao, string> = {
  aberto: 'Aberto',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  em_desenvolvimento: 'Em Desenvolvimento',
  concluido: 'Concluído',
  rejeitado: 'Rejeitado',
}

export default function DetalheSolicitacao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null)
  const [podeAprovar, setPodeAprovar] = useState(false)
  const [loading, setLoading] = useState(true)

  const carregar = () => {
    if (!id) return
    setLoading(true)
    buscarSolicitacao(id)
      .then(setSolicitacao)
      .catch(() => toast({ title: 'Pedido não encontrado', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .rpc('hub_pode_executar', {
        p_usuario_id: user.id,
        p_system_slug: 'solicitacoes',
        p_modulo_chave: null,
        p_acao: 'aprovar',
      })
      .then(({ data }) => setPodeAprovar(Boolean(data)))
  }, [user?.id])

  const handleStatusChange = async (status: StatusSolicitacao) => {
    if (!solicitacao) return
    try {
      await atualizarStatus(solicitacao.id, status)
      setSolicitacao({ ...solicitacao, status })
      toast({ title: 'Status atualizado' })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
  if (!solicitacao) return null

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Voltar ao painel
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {solicitacao.tipo === 'bug' ? (
              <Bug className="w-4 h-4" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            {solicitacao.tipo === 'bug' ? 'Bug' : 'Pedido de Alteração'}
            {solicitacao.sistema_relacionado_nome && (
              <>
                <span>·</span>
                {solicitacao.sistema_relacionado_nome}
              </>
            )}
          </div>
          <CardTitle className="text-xl">{solicitacao.titulo}</CardTitle>
          <div className="flex items-center gap-2">
            {solicitacao.classificacao_ia === 'estrutural' && (
              <Badge className="bg-red-500/15 text-red-300 hover:bg-red-500/15 border-red-500/30">
                Estrutural
              </Badge>
            )}
            {solicitacao.classificacao_ia === 'pontual' && (
              <Badge className="bg-sky-500/15 text-sky-300 hover:bg-sky-500/15 border-sky-500/30">
                Pontual
              </Badge>
            )}
            {!solicitacao.classificacao_ia && (
              <Badge variant="outline" className="text-muted-foreground">
                Classificando...
              </Badge>
            )}
            <Badge variant="secondary">{STATUS_LABEL[solicitacao.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              Descrição
            </h4>
            <p className="text-sm whitespace-pre-wrap">{solicitacao.descricao}</p>
          </div>

          {solicitacao.justificativa_ia && (
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Justificativa da IA
              </h4>
              <p className="text-sm">{solicitacao.justificativa_ia}</p>
              {solicitacao.confianca_ia != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Confiança: {Math.round(solicitacao.confianca_ia * 100)}%
                </p>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Aberto por {solicitacao.autor_nome || '—'} em{' '}
            {new Date(solicitacao.criado_em).toLocaleString('pt-BR')}
          </div>

          {podeAprovar && (
            <div className="pt-2 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Mudar status
              </h4>
              <Select value={solicitacao.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
