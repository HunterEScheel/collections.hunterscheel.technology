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
  // RLS ties a character to its owner; the column is set here so the insert
  // satisfies the policy rather than being rejected by it.
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('hexcraft_characters')
    .insert({ name: c.name || 'Unnamed', data: c, user_id: auth.user?.id })
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
    .from('hexcraft_characters')
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
    .from('hexcraft_characters')
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
    .from('hexcraft_characters')
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
  const { error } = await supabase.from('hexcraft_characters').delete().eq('id', id)
  if (error) {
    console.error('deleteCharacter failed', error)
    return false
  }
  return true
}
