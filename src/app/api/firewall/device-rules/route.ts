import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getFirewallPolicies, isZoneBasedFirewallEnabled } from '@/lib/unifi'
import { getRulesForDevice } from '@/lib/unifi/mapping'
import { ERROR_MESSAGES } from '@/lib/definitions'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const mac = searchParams.get('mac')
  if (!mac) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'mac query parameter is required' },
      { status: 400 }
    )
  }

  const [policies, isZBF] = await Promise.all([
    getFirewallPolicies(),
    isZoneBasedFirewallEnabled(),
  ])

  const matching = getRulesForDevice(policies, { mac }, isZBF)

  return NextResponse.json(
    matching.map(p => ({ id: p._id, name: p.name, enabled: p.enabled }))
  )
}
