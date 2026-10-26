import { supabase } from '@/lib/supabase/client'

export type TipoSolicitacao = 'bug' | 'pedido_alteracao'
export type ClassificacaoIA = 'estrutural' | 'pontual' | null
export type StatusSolicitacao =
  | 'aberto'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'em_desenvolvimento'
  | 'concluido'

export interface Solicitacao {
  id: string
  usuario_id: string
  titulo: string
  descricao: string
  sistema_relacionado_id: string | null
  tipo: TipoSolicitacao
  classificacao_ia: ClassificacaoIA
  justificativa_ia: string | null
  confianca_ia: number | null
  status: StatusSolicitacao
  spec_numero: string | null
  criado_em: string
  atualizado_em: string
  // campos resolvidos por join, quando disponíveis
  autor_nome?: string | null
  sistema_relacionado_nome?: string | null
}

// SPEC-121: tabela nova, ainda fora do dump de tipos gerado — mesmo padrão
// `as any` já usado em outros services do ecossistema (ex: produtos.ts) pra
// tabelas/views que não estão em src/lib/supabase/types.ts.
export async function listarSolicitacoes(): Promise<Solicitacao[]> {
  const { data, error } = await (supabase.from as any)('solicitacoes')
    .select(
      `
      *,
      autor:usuarios!solicitacoes_usuario_id_fkey(nome),
      sistema_relacionado:systems(name)
    `,
    )
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []).map((row: any) => ({
    ...row,
    autor_nome: row.autor?.nome ?? null,
    sistema_relacionado_nome: row.sistema_relacionado?.name ?? null,
  }))
}

export async function buscarSolicitacao(id: string): Promise<Solicitacao> {
  const { data, error } = await (supabase.from as any)('solicitacoes')
    .select(
      `
      *,
      autor:usuarios!solicitacoes_usuario_id_fkey(nome),
      sistema_relacionado:systems(name)
    `,
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    ...data,
    autor_nome: data.autor?.nome ?? null,
    sistema_relacionado_nome: data.sistema_relacionado?.name ?? null,
  }
}

export interface NovaSolicitacaoPayload {
  titulo: string
  descricao: string
  tipo: TipoSolicitacao
  sistema_relacionado_id: string | null
}

export async function criarSolicitacao(payload: NovaSolicitacaoPayload): Promise<Solicitacao> {
  const { data: userData } = await supabase.auth.getUser()
  const usuario_id = userData.user?.id
  if (!usuario_id) throw new Error('Usuário não autenticado')

  const { data, error } = await (supabase.from as any)('solicitacoes')
    .insert([{ ...payload, usuario_id }])
    .select()
    .single()
  if (error) throw error

  // Dispara a classificação por IA em segundo plano — falha aqui não deve
  // impedir a criação do pedido (ver SPEC-121).
  supabase.functions
    .invoke('classificar_solicitacao', { body: { solicitacao_id: data.id } })
    .catch(() => {})

  return data as Solicitacao
}

// SPEC-225: o autor edita o próprio pedido só enquanto está Aberto (o banco confere). A classificação da IA é
// refeita depois de salvar.
export async function editarSolicitacao(id: string, payload: NovaSolicitacaoPayload): Promise<void> {
  const { error } = await (supabase as any).rpc('editar_minha_solicitacao', {
    p_id: id,
    p_titulo: payload.titulo,
    p_descricao: payload.descricao,
    p_tipo: payload.tipo,
    p_sistema_relacionado_id: payload.sistema_relacionado_id,
  })
  if (error) throw error
  supabase.functions
    .invoke('classificar_solicitacao', { body: { solicitacao_id: id } })
    .catch(() => {})
}

// SPEC-225: fotos do pedido — bucket privado solicitacoes-anexos, pasta = id do pedido.
const BUCKET_ANEXOS = 'solicitacoes-anexos'
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const TAMANHO_MAX_FOTO = 10 * 1024 * 1024

export interface AnexoSolicitacao {
  id: string
  solicitacao_id: string
  path: string
  nome_arquivo: string | null
  criado_por: string
  criado_em: string
  url: string | null
}

/** Confere tipo e tamanho; devolve a mensagem de erro ou null. */
export function validarFoto(f: File): string | null {
  if (!TIPOS_FOTO.includes(f.type)) return `${f.name}: use foto JPG, PNG, WEBP ou GIF.`
  if (f.size > TAMANHO_MAX_FOTO) return `${f.name}: a foto passa de 10 MB.`
  return null
}

export async function podeAnexar(solicitacaoId: string): Promise<boolean> {
  const { data } = await (supabase as any).rpc('solicitacao_pode_anexar', { p_solicitacao_id: solicitacaoId })
  return Boolean(data)
}

export async function listarAnexos(solicitacaoId: string): Promise<AnexoSolicitacao[]> {
  const { data, error } = await (supabase.from as any)('solicitacao_anexos')
    .select('id, solicitacao_id, path, nome_arquivo, criado_por, criado_em')
    .eq('solicitacao_id', solicitacaoId)
    .order('criado_em')
  if (error) throw error
  const linhas = (data ?? []) as Omit<AnexoSolicitacao, 'url'>[]
  if (linhas.length === 0) return []
  const { data: urls } = await supabase.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrls(
      linhas.map((l) => l.path),
      60 * 60,
    )
  const porPath = new Map((urls ?? []).map((u: any) => [u.path, u.signedUrl as string]))
  return linhas.map((l) => ({ ...l, url: porPath.get(l.path) ?? null }))
}

/** Sobe as fotos e registra cada uma. Devolve quantas subiram e os erros. */
export async function enviarFotos(
  solicitacaoId: string,
  arquivos: File[],
): Promise<{ enviadas: number; erros: string[] }> {
  const { data: userData } = await supabase.auth.getUser()
  const usuarioId = userData.user?.id
  let enviadas = 0
  const erros: string[] = []
  for (const f of arquivos) {
    const invalida = validarFoto(f)
    if (invalida) {
      erros.push(invalida)
      continue
    }
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${solicitacaoId}/${crypto.randomUUID()}.${ext}`
    const { error: up } = await supabase.storage
      .from(BUCKET_ANEXOS)
      .upload(path, f, { contentType: f.type, upsert: false })
    if (up) {
      erros.push(`${f.name}: ${up.message}`)
      continue
    }
    const { error: ins } = await (supabase.from as any)('solicitacao_anexos').insert({
      solicitacao_id: solicitacaoId,
      path,
      nome_arquivo: f.name,
      tipo_mime: f.type,
      tamanho: f.size,
      criado_por: usuarioId,
    })
    if (ins) {
      await supabase.storage.from(BUCKET_ANEXOS).remove([path])
      erros.push(`${f.name}: ${ins.message}`)
      continue
    }
    enviadas++
  }
  return { enviadas, erros }
}

export async function removerAnexo(anexo: AnexoSolicitacao): Promise<void> {
  const { data, error } = await (supabase.from as any)('solicitacao_anexos')
    .delete()
    .eq('id', anexo.id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Sem permissão para remover esta foto.')
  await supabase.storage.from(BUCKET_ANEXOS).remove([anexo.path])
}

export async function atualizarStatus(id: string, status: StatusSolicitacao): Promise<void> {
  const { error } = await (supabase.from as any)('solicitacoes').update({ status }).eq('id', id)
  if (error) throw error
}

export async function listarSistemas(): Promise<{ id: string; name: string; slug: string }[]> {
  const { data, error } = await supabase
    .from('systems')
    .select('id, name, slug')
    .eq('visivel_no_hub', true)
    .neq('slug', 'solicitacoes')
    .order('display_order')
  if (error) throw error
  return data || []
}
