import { content as fallbackContent } from '../data/content'
import type { SiteContent } from '../types'

const CACHE_KEY = 'agape_site_content_v1'

function readParseCache(): SiteContent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SiteContent
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.hero?.headline) &&
      parsed.hero.headline.length > 0 &&
      typeof parsed.meta?.title === 'string'
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Первый кадр после F5: последний удачный контент из CMS, без промаргивания content.ts */
export function getInitialSiteContent(): SiteContent {
  return readParseCache() ?? fallbackContent
}

export function cacheSiteContentFromCms(data: SiteContent): void {
  if (data === fallbackContent) return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

/**
 * Если запрос к CMS упал или вернул fallback — показываем последний кэш,
 * чтобы не мигать дефолтными заголовками.
 */
export function resolveLoadedSiteContent(loaded: SiteContent): SiteContent {
  if (loaded !== fallbackContent) return loaded
  return readParseCache() ?? loaded
}
