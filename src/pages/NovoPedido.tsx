import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { criarSolicitacao, enviarFotos, listarSistemas, TipoSolicitacao } from '@/services/solicitacoes'
import { SeletorFotos } from '@/components/Fotos'

export default function NovoPedido() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [sistemas, setSistemas] = useState<{ id: string; name: string; slug: string }[]>([])
  const [tipo, setTipo] = useState<TipoSolicitacao>('bug')
  const [sistemaRelacionadoId, setSistemaRelacionadoId] = useState<string>('none')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  // SPEC-225: fotos escolhidas antes de salvar; sobem depois que o pedido é criado
  const [fotos, setFotos] = useState<File[]>([])

  useEffect(() => {
    listarSistemas().then(setSistemas).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !descricao.trim()) {
      toast({ title: 'Preencha título e descrição', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const criada = await criarSolicitacao({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        sistema_relacionado_id: sistemaRelacionadoId === 'none' ? null : sistemaRelacionadoId,
      })
      const r = fotos.length ? await enviarFotos(criada.id, fotos) : { enviadas: 0, erros: [] as string[] }
      toast({
        title: 'Pedido registrado!',
        description: `${r.enviadas ? `${r.enviadas} foto(s) anexada(s). ` : ''}A classificação da IA aparece em alguns segundos no painel.`,
      })
      if (r.erros.length)
        toast({
          title: 'Algumas fotos não subiram',
          description: `${r.erros.join(' · ')} — abra o pedido e adicione de novo.`,
          variant: 'destructive',
        })
      navigate('/')
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar pedido',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo Pedido</CardTitle>
          <CardDescription>
            Reporte um bug ou peça uma alteração. A IA classifica automaticamente como estrutural ou
            pontual assim que você salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoSolicitacao)}>
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
                <Select value={sistemaRelacionadoId} onValueChange={setSistemaRelacionadoId}>
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
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Resumo curto do pedido"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que está acontecendo (bug) ou o que deveria mudar (pedido de alteração)"
                rows={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fotos (opcional)</Label>
              <SeletorFotos arquivos={fotos} onChange={setFotos} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar Pedido'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
