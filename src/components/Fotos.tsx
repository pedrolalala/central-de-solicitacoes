import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  enviarFotos,
  listarAnexos,
  removerAnexo,
  TIPOS_FOTO,
  validarFoto,
  type AnexoSolicitacao,
} from '@/services/solicitacoes'

// SPEC-225: fotos do pedido. SeletorFotos guarda as fotos escolhidas antes de o pedido existir (Novo Pedido);
// GaleriaFotos mostra/adiciona/remove as fotos de um pedido já salvo. Aceita escolher arquivo, arrastar ou colar
// (Ctrl+V de um print).

function arquivosDoEvento(lista: FileList | DataTransferItemList | null | undefined): File[] {
  if (!lista) return []
  const out: File[] = []
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i] as any
    const f: File | null = item instanceof File ? item : item.kind === 'file' ? item.getAsFile() : null
    if (f && f.type.startsWith('image/')) out.push(f)
  }
  return out
}

function AreaFotos({
  onArquivos,
  desabilitado,
  enviando,
}: {
  onArquivos: (fs: File[]) => void
  desabilitado?: boolean
  enviando?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div
      tabIndex={0}
      onPaste={(e) => {
        const fs = arquivosDoEvento(e.clipboardData?.items)
        if (fs.length) {
          e.preventDefault()
          onArquivos(fs)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onArquivos(arquivosDoEvento(e.dataTransfer?.files))
      }}
      className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground outline-none focus:border-primary"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={desabilitado || enviando}
        onClick={() => input.current?.click()}
      >
        {enviando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
        Adicionar fotos
      </Button>
      <span>ou arraste aqui, ou clique nesta área e cole um print (Ctrl+V). JPG, PNG, WEBP ou GIF até 10 MB.</span>
      <input
        ref={input}
        type="file"
        accept={TIPOS_FOTO.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          onArquivos(arquivosDoEvento(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** Fotos escolhidas no Novo Pedido (sobem depois que o pedido é criado). */
export function SeletorFotos({ arquivos, onChange }: { arquivos: File[]; onChange: (fs: File[]) => void }) {
  const { toast } = useToast()
  const previas = useMemo(() => arquivos.map((f) => URL.createObjectURL(f)), [arquivos])
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas])

  function adicionar(fs: File[]) {
    const ok: File[] = []
    for (const f of fs) {
      const erro = validarFoto(f)
      if (erro) toast({ title: 'Foto não aceita', description: erro, variant: 'destructive' })
      else ok.push(f)
    }
    if (ok.length) onChange([...arquivos, ...ok])
  }

  return (
    <div className="space-y-2">
      <AreaFotos onArquivos={adicionar} />
      {arquivos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {arquivos.map((f, i) => (
            <div key={i} className="relative">
              <img src={previas[i]} alt={f.name} className="h-20 w-20 rounded border object-cover" />
              <button
                type="button"
                onClick={() => onChange(arquivos.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-background border p-0.5 text-muted-foreground hover:text-destructive"
                title="Tirar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Fotos de um pedido salvo. `podeEditar` = pode adicionar/remover (autor com pedido Aberto, ou quem atende). */
export function GaleriaFotos({ solicitacaoId, podeEditar }: { solicitacaoId: string; podeEditar: boolean }) {
  const { toast } = useToast()
  const [fotos, setFotos] = useState<AnexoSolicitacao[] | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aberta, setAberta] = useState<AnexoSolicitacao | null>(null)

  const carregar = useCallback(() => {
    listarAnexos(solicitacaoId)
      .then(setFotos)
      .catch(() => setFotos([]))
  }, [solicitacaoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(fs: File[]) {
    if (!fs.length) return
    setEnviando(true)
    try {
      const r = await enviarFotos(solicitacaoId, fs)
      if (r.enviadas) toast({ title: `${r.enviadas} foto(s) anexada(s)` })
      if (r.erros.length)
        toast({ title: 'Algumas fotos não subiram', description: r.erros.join(' · '), variant: 'destructive' })
      carregar()
    } finally {
      setEnviando(false)
    }
  }

  async function remover(a: AnexoSolicitacao) {
    try {
      await removerAnexo(a)
      setFotos((prev) => (prev ?? []).filter((x) => x.id !== a.id))
    } catch (err: any) {
      toast({ title: 'Erro ao remover a foto', description: err?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Fotos</h4>
      {fotos === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {fotos.map((a) => (
            <div key={a.id} className="relative">
              <button type="button" onClick={() => setAberta(a)} title={a.nome_arquivo ?? ''}>
                {a.url ? (
                  <img src={a.url} alt={a.nome_arquivo ?? 'foto'} className="h-24 w-24 rounded border object-cover" />
                ) : (
                  <div className="h-24 w-24 rounded border bg-secondary" />
                )}
              </button>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => remover(a)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-background border p-0.5 text-muted-foreground hover:text-destructive"
                  title="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {podeEditar && <AreaFotos onArquivos={adicionar} enviando={enviando} />}

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="text-sm">{aberta?.nome_arquivo ?? 'Foto'}</DialogTitle>
          {aberta?.url && <img src={aberta.url} alt="" className="max-h-[75vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
