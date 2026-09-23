#!/usr/bin/env node
// Generate OpenAI embeddings for a list of non-combat skills
// and upsert them into Supabase.
//
// Usage:
//   1. Put your skill list in scripts/skills.txt (one "Name | description" per line,
//      or just "Name" — description is optional).
//   2. Set env vars: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//   3. node scripts/generate-embeddings.mjs

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
const BATCH_SIZE = 64

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing required env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const lines = readFileSync('scripts/skills.txt', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)

const skills = lines.map((line) => {
  const [name, ...descParts] = line.split('|').map((s) => s.trim())
  return { name, description: descParts.join(' | ') || null }
})

console.log(`Embedding ${skills.length} skills with ${MODEL}...`)

async function embedBatch(inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  return json.data.map((d) => d.embedding)
}

for (let i = 0; i < skills.length; i += BATCH_SIZE) {
  const batch = skills.slice(i, i + BATCH_SIZE)
  const inputs = batch.map((s) =>
    s.description ? `${s.name}: ${s.description}` : s.name,
  )
  const embeddings = await embedBatch(inputs)
  const rows = batch.map((s, j) => ({
    skill_name: s.name,
    description: s.description,
    embedding: embeddings[j],
  }))
  const { error } = await supabase
    .from('skill_embeddings')
    .upsert(rows, { onConflict: 'skill_name' })
  if (error) {
    console.error('upsert failed', error)
    process.exit(1)
  }
  console.log(`  ${Math.min(i + BATCH_SIZE, skills.length)}/${skills.length}`)
}

console.log('done.')
