import { createContext, useContext } from 'react'
import { content as fallbackContent } from '../data/content'
import type { SiteContent } from '../types'

export const SiteContentContext = createContext<SiteContent>(fallbackContent)

export function useSiteContent() {
  return useContext(SiteContentContext)
}

export { fallbackContent }
