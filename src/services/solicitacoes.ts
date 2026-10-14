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
