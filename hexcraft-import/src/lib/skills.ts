import { supabase, supabaseConfigured } from './supabase'

export interface SkillEmbedding {
  id: number
  name: string
  description: string | null
  embedding: number[]
}

export interface SkillSearchResult {
  id: number
  name: string
  description: string | null
  similarity?: number
}

export async function searchSkills(
  query: string,
  limit = 12,
): Promise<SkillSearchResult[]> {
  if (!supabaseConfigured || !supabase || !query.trim()) return []

  const { data, error } = await supabase
    .from('skill_embeddings')
    .select('id, skill_name, description')
    .ilike('skill_name', `%${query}%`)
    .order('skill_name', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('skill search failed', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id as number,
    name: row.skill_name as string,
    description: (row.description as string | null) ?? null,
  }))
}

export async function searchSkillsBySimilarity(
  embedding: number[],
  limit = 12,
): Promise<SkillSearchResult[]> {
  if (!supabaseConfigured || !supabase) return []

  const { data, error } = await supabase.rpc('match_skills', {
    query_embedding: embedding,
    match_count: limit,
  })

  if (error) {
    console.error('similarity search failed', error)
    return []
  }

  return (data ?? []) as SkillSearchResult[]
}
