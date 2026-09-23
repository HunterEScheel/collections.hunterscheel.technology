import type { Character } from '../system/character'
import { supabase, supabaseConfigured } from './supabase'

export interface SavedCharacterRow {
  id: string
  name: string
  data: Character
  created_at: string
  updated_at: string
}

export async function saveCharacter(c: Character): Promise<string | null> {
  if (!supabaseConfigured || !supabase) {
    console.warn('supabase not configured — character not saved')
    return null
  }
  const { data, error } = await supabase
    .from('characters')
    .insert({ name: c.name || 'Unnamed', data: c })
    .select('id')
    .single()
  if (error) {
    console.error('saveCharacter failed', error)
    return null
  }
  return data.id as string
}

export async function updateCharacter(
  id: string,
  c: Character,
): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false
  const { error } = await supabase
    .from('characters')
    .update({ name: c.name || 'Unnamed', data: c })
    .eq('id', id)
  if (error) {
    console.error('updateCharacter failed', error)
    return false
  }
  return true
}

export async function getCharacter(
  id: string,
): Promise<SavedCharacterRow | null> {
  if (!supabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, data, created_at, updated_at')
    .eq('id', id)
    .single()
  if (error) {
    console.error('getCharacter failed', error)
    return null
  }
  return data as SavedCharacterRow
}

export async function listCharacters(): Promise<SavedCharacterRow[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, data, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('listCharacters failed', error)
    return []
  }
  return (data ?? []) as SavedCharacterRow[]
}

export async function deleteCharacter(id: string): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) {
    console.error('deleteCharacter failed', error)
    return false
  }
  return true
}
