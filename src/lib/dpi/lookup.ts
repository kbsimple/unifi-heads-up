import 'server-only'
import catAppJson from './cat_app.json'

interface CatEntry {
  name: string
}

interface AppEntry {
  name: string
}

interface CatAppJson {
  version: { major: number; minor: number }
  categories: Record<string, CatEntry>
  applications: Record<string, AppEntry>
}

export interface AppLookup {
  compoundId: number
  appName: string
  catName: string
}

const json = catAppJson as CatAppJson

/**
 * Decode a UniFi DPI compound ID into human-readable app and category names.
 *
 * Compound ID formula (per ubntwiki and Art-of-WiFi source):
 *   compoundId = (cat << 16) + app
 *
 * Example: cat=4 (Media streaming services), app=112 → compoundId=262256 → "Youtube"
 *
 * Returns fallback strings for unknown IDs — never throws.
 */
export function decodeAppId(cat: number, app: number): AppLookup {
  const compoundId = (cat << 16) + app
  const appEntry = json.applications[String(compoundId)]
  const catEntry = json.categories[String(cat)]
  return {
    compoundId,
    appName: appEntry?.name ?? `App ${compoundId}`,
    catName: catEntry?.name ?? `Category ${cat}`,
  }
}
