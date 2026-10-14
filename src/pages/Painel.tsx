import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Bug, Wrench, RefreshCw } from 'lucide-react'
import { listarSolicitacoes, Solicitacao, StatusSolicitacao } from '@/services/solicitacoes'

const COLUNAS: { status: StatusSolicitacao; titulo: string }[] = [
  { status: 'aberto', titulo: 'Aberto' },
  { status: 'em_analise', titulo: 'Em Análise' },
  { status: 'aprovado', titulo: 'Aprovado' },
  { status: 'em_desenvolvimento', titulo: 'Em Desenvolvimento' },
  { status: 'concluido', titulo: 'Concluído' },
  { status: 'rejeitado', titulo: 'Rejeitado' },
]

function ClassificacaoBadge({ classificacao }: { classificacao: Solicitacao['classificacao_ia'] }) {
  if (classificacao === 'estrutural')
    return (
      <Badge className="bg-red-500/15 text-red-300 hover:bg-red-500/15 border-red-500/30">
        Estrutural
      </Badge>
    )
  if (classificacao === 'pontual')
    return (
      <Badge className="bg-sky-500/15 text-sky-300 hover:bg-sky-500/15 border-sky-500/30">
        Pontual
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Classificando...
    </Badge>
  )
}

export default function Painel() {
  const navigate = useNavigate()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroClassificacao, setFiltroClassificacao] = useState('todas')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const carregar = () => {
    setLoading(true)
    listarSolicitacoes()
      .then(setSolicitacoes)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = useMemo(() => {
    return solicitacoes.filter((s) => {
      if (filtroClassificacao !== 'todas' && s.classificacao_ia !== filtroClassificacao)
        return false
      if (filtroTipo !== 'todos' && s.tipo !== filtroTipo) return false
      return true
    })
  }, [solicitacoes, filtroClassificacao, filtroTipo])

  const porStatus = (status: StatusSolicitacao) => filtradas.filter((s) => s.status === status)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Central de Solicitações</h1>
          <p className="text-sm text-muted-foreground">
            Bugs e pedidos de alteração registrados pela equipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={carregar} title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate('/novo')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Pedido
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filtroClassificacao} onValueChange={setFiltroClassificacao}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as classificações</SelectItem>
            <SelectItem value="estrutural">Só estruturais</SelectItem>
            <SelectItem value="pontual">Só pontuais</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="bug">Só bugs</SelectItem>
            <SelectItem value="pedido_alteracao">Só pedidos de alteração</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map((coluna) => (
            <div key={coluna.status} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {coluna.titulo}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {porStatus(coluna.status).length}
                </span>
              </div>
              <div className="space-y-2">
                {porStatus(coluna.status).map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/pedido/${s.id}`)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {s.tipo === 'bug' ? (
                            <Bug className="w-3.5 h-3.5" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                          {s.tipo === 'bug' ? 'Bug' : 'Alteração'}
                        </span>
                        <ClassificacaoBadge classificacao={s.classificacao_ia} />
                      </div>
                      <p className="text-sm font-medium leading-snug">{s.titulo}</p>
                      {s.sistema_relacionado_nome && (
                        <p className="text-xs text-muted-foreground">
                          {s.sistema_relacionado_nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{s.autor_nome || '—'}</p>
                    </CardContent>
                  </Card>
                ))}
                {porStatus(coluna.status).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
