// src/app/api/firewall/starred/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { ERROR_MESSAGES } from '@/lib/definitions'

/**
 * Schema for POST request body validation
 * Per threat model T-09-01: Zod validates ruleId is non-empty string and starred is boolean
 */
const StarredRequestSchema = z.object({
  ruleId: z.string().min(1, 'Rule ID is required'),
  starred: z.boolean(),
})

/**
 * GET /api/firewall/starred
 * Returns array of starred rule IDs
 *
 * Per threat model T-09-02: Requires session verification before any DB access
 */
export async function GET() {
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  const db = getDb()
  const rows = db.prepare('SELECT rule_id FROM starred_rules').all() as { rule_id: string }[]
  const starredIds = rows.map((r) => r.rule_id)

  return NextResponse.json({ starredIds })
}

/**
 * POST /api/firewall/starred
 * Upserts or deletes a starred rule entry
 *
 * Per threat model T-09-01: Zod schema validation on ruleId and starred
 * Per threat model T-09-02: Requires session verification
 * Per threat model T-09-03: Parameterized prepared statements prevent SQL injection
 */
export async function POST(request: Request) {
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const result = StarredRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    )
  }

  const { ruleId, starred } = result.data
  const db = getDb()

  if (starred) {
    // INSERT OR REPLACE is idempotent — upserts without duplicate error
    db.prepare('INSERT OR REPLACE INTO starred_rules (rule_id, starred_at) VALUES (?, ?)').run(
      ruleId,
      Math.floor(Date.now() / 1000)
    )
  } else {
    db.prepare('DELETE FROM starred_rules WHERE rule_id = ?').run(ruleId)
  }

  return NextResponse.json({ ok: true })
}
