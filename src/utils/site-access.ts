/** Chrome host patterns do not distinguish ports. Never include subdomains implicitly. */
export function sitePattern(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) return null
    return `${parsed.protocol}//${parsed.hostname}/*`
  } catch {
    return null
  }
}

export function exactSitePatterns(origins: string[]): string[] {
  return [...new Set(origins.filter(origin =>
    /^https?:\/\/[^/*]+\/\*$/.test(origin) && sitePattern(origin) === origin
  ))].sort()
}

export async function grantedSites(): Promise<string[]> {
  return exactSitePatterns((await chrome.permissions.getAll()).origins ?? [])
}

export const SITE_SCRIPT_ID = 'mfa-authorized-sites'

export async function reconcileSiteScripts(): Promise<void> {
  const matches = await grantedSites()
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SITE_SCRIPT_ID] })
  if (!matches.length) {
    if (scripts.length) await chrome.scripting.unregisterContentScripts({ ids: [SITE_SCRIPT_ID] })
    return
  }
  const script: chrome.scripting.RegisteredContentScript = {
    id: SITE_SCRIPT_ID, matches, js: ['content-script.js'],
    allFrames: true, runAt: 'document_idle', persistAcrossSessions: true,
  }
  if (scripts.length) await chrome.scripting.updateContentScripts([script])
  else await chrome.scripting.registerContentScripts([script])
}
