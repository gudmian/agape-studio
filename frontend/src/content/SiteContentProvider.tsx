import { loadSiteContentFromCms } from '../api/cms'
import {
  cacheSiteContentFromCms,
  getInitialSiteContent,
  resolveLoadedSiteContent,
} from './cmsSessionCache'
import { SiteContentContext, fallbackContent } from './siteContentContext'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { SiteContent } from '../types'

type SiteContentProviderProps = {
  children: ReactNode
}

export function SiteContentProvider({ children }: SiteContentProviderProps) {
  const [siteContent, setSiteContent] = useState<SiteContent>(getInitialSiteContent)

  useEffect(() => {
    let mounted = true

    async function load() {
      const loadedContent = await loadSiteContentFromCms()
      if (!mounted) return
      const resolved = resolveLoadedSiteContent(loadedContent)
      setSiteContent(resolved)
      if (loadedContent !== fallbackContent) {
        cacheSiteContentFromCms(loadedContent)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  return <SiteContentContext.Provider value={siteContent}>{children}</SiteContentContext.Provider>
}
