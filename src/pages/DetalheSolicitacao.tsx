import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bug, Pencil, Wrench } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { GaleriaFotos } from '@/components/Fotos'
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
  editarSolicitacao,
  listarSistemas,
  podeAnexar,
  Solicitacao,
  StatusSolicitacao,
  TipoSolicitacao,
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
  // SPEC-225: autor edita enquanto está Aberto; fotos (autor com pedido Aberto, ou quem atende)
  const [podeFotos, setPodeFotos] = useState(false)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sistemas, setSistemas] = useState<{ id: string; name: string }[]>([])
  const [eTitulo, setETitulo] = useState('')
  const [eDescricao, setEDescricao] = useState('')
  const [eTipo, setETipo] = useState<TipoSolicitacao>('bug')
  const [eSistema, setESistema] = useState('none')

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

  const solId = solicitacao?.id
  const solStatus = solicitacao?.status
  useEffect(() => {
    if (!solId) return
    podeAnexar(solId).then(setPodeFotos)
  }, [solId, solStatus])

  const ehAutor = !!solicitacao && !!user?.id && solicitacao.usuario_id === user.id
  const podeEditar = ehAutor && solicitacao?.status === 'aberto'

  function abrirEdicao() {
    if (!solicitacao) return
    setETitulo(solicitacao.titulo)
    setEDescricao(solicitacao.descricao)
    setETipo(solicitacao.tipo)
    setESistema(solicitacao.sistema_relacionado_id ?? 'none')
    if (sistemas.length === 0) listarSistemas().then(setSistemas).catch(() => setSistemas([]))
    setEditando(true)
  }

  async function salvarEdicao() {
    if (!solicitacao) return
    if (!eTitulo.trim() || !eDescricao.trim()) {
      toast({ title: 'Preencha título e descrição', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      await editarSolicitacao(solicitacao.id, {
        titulo: eTitulo.trim(),
        descricao: eDescricao.trim(),
        tipo: eTipo,
        sistema_relacionado_id: eSistema === 'none' ? null : eSistema,
      })
      toast({ title: 'Pedido atualizado', description: 'A classificação da IA é refeita em alguns segundos.' })
      setEditando(false)
      carregar()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

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
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">{solicitacao.titulo}</CardTitle>
            {podeEditar && !editando && (
              <Button variant="outline" size="sm" onClick={abrirEdicao}>
                <Pencil className="w-4 h-4 mr-1.5" /> Editar
              </Button>
            )}
          </div>
          {ehAutor && solicitacao.status !== 'aberto' && (
            <p className="text-xs text-muted-foreground">
              O pedido já está sendo atendido: não dá mais para editar.
            </p>
          )}
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
          {editando ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={eTipo} onValueChange={(v) => setETipo(v as TipoSolicitacao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="pedido_alteracao">Pedido de Alteração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sistema relacionado</Label>
                  <Select value={eSistema} onValueChange={setESistema}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {sistemas.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={eTitulo} onChange={(e) => setETitulo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea rows={6} value={eDescricao} onChange={(e) => setEDescricao(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Só dá para editar enquanto o pedido está Aberto. As fotos você adiciona ou remove logo abaixo.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditando(false)} disabled={salvando}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={salvarEdicao} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Descrição
              </h4>
              <p className="text-sm whitespace-pre-wrap">{solicitacao.descricao}</p>
            </div>
          )}

          <GaleriaFotos solicitacaoId={solicitacao.id} podeEditar={podeFotos} />

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
