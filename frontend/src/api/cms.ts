import { content as fallbackContent } from '../data/content'
import type { ProcessStep, Project, Service, SiteContent } from '../types'

type DirectusListResponse<T> = {
  data: T[]
}

type ProjectGalleryRow = {
  sort?: number | null
  file?: string | { id: string } | null
}

type ProjectItem = {
  slug: string
  title: string
  style: string
  area: string
  city: string
  image?: string | { id: string } | null
  /** Устаревший способ: JSON-массив UUID (если осталось со старого bootstrap) */
  gallery?: unknown
  /** O2M: строки в project_gallery с файлом и sort — удобное заполнение в админке */
  gallery_items?: ProjectGalleryRow[] | null
  image_placeholder_dark?: boolean | null
}

type ServiceItem = {
  slug: string
  name: string
  description: string
  price: string
  featured?: boolean | null
  features?: string[] | string | null
}

type ProcessStepItem = {
  number: string
  title: string
  description: string
}

type SiteContentItem = {
  meta_title: string
  meta_description: string
  hero_badge: string
  hero_headline_line1: string
  hero_headline_line2: string
  hero_subtitle: string
  hero_cta_primary: string
  hero_cta_secondary: string
  hero_background_image?: string | { id: string } | null
  portfolio_eyebrow: string
  portfolio_title: string
  portfolio_subtitle: string
  services_eyebrow: string
  services_title: string
  process_eyebrow: string
  process_title_line1: string
  process_title_line2: string
  process_description: string
  contact_eyebrow: string
  contact_title: string
  contact_description: string
  form_name_placeholder: string
  form_phone_placeholder: string
  form_email_placeholder: string
  form_message_placeholder: string
  form_submit_label: string
  footer_copyright: string
}

function getCmsEnv() {
  const baseUrl = import.meta.env.VITE_CMS_URL?.trim().replace(/\/$/, '')
  const token = import.meta.env.VITE_CMS_TOKEN?.trim()
  return { baseUrl, token }
}

async function directusRequest<T>(path: string): Promise<T> {
  const { baseUrl, token } = getCmsEnv()
  if (!baseUrl) {
    throw new Error('CMS url is not configured')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`CMS request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function normalizeSiteContentPayload(data: unknown): SiteContentItem | null {
  if (data == null) return null
  if (Array.isArray(data)) {
    const first = data[0]
    if (first && typeof first === 'object' && 'meta_title' in first) {
      return first as SiteContentItem
    }
    return null
  }
  if (typeof data === 'object' && data !== null && 'meta_title' in data) {
    return data as SiteContentItem
  }
  return null
}

/** Singleton: в разных версиях Directus разный URL (…/singleton или обычный items). */
async function fetchSiteContentItem(): Promise<SiteContentItem | null> {
  const { baseUrl, token } = getCmsEnv()
  if (!baseUrl) return null

  const paths = ['/items/site_content/singleton', '/items/site_content']

  for (const path of paths) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        cache: 'no-store',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      })
      if (!response.ok) continue
      const json = (await response.json()) as { data?: unknown }
      const item = normalizeSiteContentPayload(json.data)
      if (item) return item
    } catch {
      continue
    }
  }
  return null
}

/**
 * <img> не шлёт Authorization. Для другого origin (http://127.0.0.1:8055/…) Directus отдаёт 403 без токена.
 * Query access_token поддерживается для /assets/:id.
 */
function assetUrlWithAccessToken(assetPath: string, token?: string): string {
  if (!token) return assetPath
  const sep = assetPath.includes('?') ? '&' : '?'
  return `${assetPath}${sep}access_token=${encodeURIComponent(token)}`
}

function getImageUrl(
  image: ProjectItem['image'],
  baseUrl: string,
  token?: string,
): string | undefined {
  if (!image) return undefined
  const id = typeof image === 'string' ? image : image.id
  return assetUrlWithAccessToken(`${baseUrl}/assets/${id}`, token)
}

function parseGalleryFileIds(gallery: ProjectItem['gallery']): string[] {
  if (gallery == null) return []
  if (Array.isArray(gallery)) {
    return gallery.filter((id): id is string => typeof id === 'string' && id.length > 0)
  }
  if (typeof gallery === 'string') {
    try {
      const parsed = JSON.parse(gallery) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
      }
    } catch {
      return []
    }
  }
  return []
}

function galleryUrlsFromO2M(
  rows: NonNullable<ProjectItem['gallery_items']>,
  baseUrl: string,
  token?: string,
): string[] {
  const sorted = [...rows].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const urls: string[] = []
  for (const row of sorted) {
    const url = getImageUrl(row.file, baseUrl, token)
    if (url) urls.push(url)
  }
  return urls
}

function buildProjectGalleryUrls(
  item: ProjectItem,
  baseUrl: string,
  token?: string,
): string[] {
  const main = getImageUrl(item.image, baseUrl, token)
  const fromO2M =
    item.gallery_items && item.gallery_items.length > 0
      ? galleryUrlsFromO2M(item.gallery_items, baseUrl, token)
      : []
  const legacyIds = parseGalleryFileIds(item.gallery)
  const legacyUrls = legacyIds.map((id) => assetUrlWithAccessToken(`${baseUrl}/assets/${id}`, token))
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const url of [main, ...fromO2M, ...legacyUrls]) {
    if (url && !seen.has(url)) {
      seen.add(url)
      ordered.push(url)
    }
  }
  return ordered
}

/** Поля проекта + вложенная галерея (O2M). */
const PROJECTS_LIST_QUERY =
  '/items/projects?filter[status][_eq]=published&sort=sort&fields=' +
  encodeURIComponent('*,gallery_items.sort,gallery_items.file')

function mapProjects(items: ProjectItem[], baseUrl: string, token?: string): Project[] {
  return items.map((item) => {
    const galleryUrls = buildProjectGalleryUrls(item, baseUrl, token)
    return {
      id: item.slug,
      title: item.title,
      style: item.style,
      area: item.area,
      city: item.city,
      imageUrl: getImageUrl(item.image, baseUrl, token),
      galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
      imagePlaceholder: item.image_placeholder_dark ? 'dark' : undefined,
    }
  })
}

function mapServices(items: ServiceItem[]): Service[] {
  const parseFeatures = (value: ServiceItem['features']): string[] => {
    if (Array.isArray(value)) {
      return value.filter((feature): feature is string => typeof feature === 'string')
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        if (Array.isArray(parsed)) {
          return parsed.filter((feature): feature is string => typeof feature === 'string')
        }
      } catch {
        return []
      }
    }

    return []
  }

  return items.map((item) => ({
    id: item.slug,
    name: item.name,
    description: item.description,
    price: item.price,
    featured: Boolean(item.featured),
    features: parseFeatures(item.features),
  }))
}

function mapProcessSteps(items: ProcessStepItem[]): ProcessStep[] {
  return items.map((item) => ({
    number: item.number,
    title: item.title,
    description: item.description,
  }))
}

function mapSiteContent(
  base: SiteContent,
  singleton: SiteContentItem,
  projects: Project[],
  services: Service[],
  steps: ProcessStep[],
  cmsBaseUrl: string,
  cmsToken?: string,
): SiteContent {
  return {
    ...base,
    meta: {
      title: singleton.meta_title,
      description: singleton.meta_description,
    },
    hero: {
      badge: singleton.hero_badge,
      headline: [singleton.hero_headline_line1, singleton.hero_headline_line2],
      subtitle: singleton.hero_subtitle,
      ctaPrimary: singleton.hero_cta_primary,
      ctaSecondary: singleton.hero_cta_secondary,
      backgroundImageUrl: getImageUrl(singleton.hero_background_image, cmsBaseUrl, cmsToken),
    },
    portfolio: {
      eyebrow: singleton.portfolio_eyebrow,
      title: singleton.portfolio_title,
      subtitle: singleton.portfolio_subtitle,
      projects,
    },
    services: {
      eyebrow: singleton.services_eyebrow,
      title: singleton.services_title,
      items: services,
    },
    process: {
      eyebrow: singleton.process_eyebrow,
      title: [singleton.process_title_line1, singleton.process_title_line2],
      description: singleton.process_description,
      steps,
    },
    contact: {
      eyebrow: singleton.contact_eyebrow,
      title: singleton.contact_title,
      description: singleton.contact_description,
      form: {
        namePlaceholder: singleton.form_name_placeholder,
        phonePlaceholder: singleton.form_phone_placeholder,
        emailPlaceholder: singleton.form_email_placeholder,
        messagePlaceholder: singleton.form_message_placeholder,
        submitLabel: singleton.form_submit_label,
      },
    },
    footer: {
      copyright: singleton.footer_copyright,
    },
  }
}

export async function loadSiteContentFromCms(): Promise<SiteContent> {
  const { baseUrl, token } = getCmsEnv()
  if (!baseUrl) {
    if (import.meta.env.DEV) {
      console.info('[CMS] VITE_CMS_URL не задан — запросы к Directus не выполняются, используется content.ts')
    }
    return fallbackContent
  }

  if (import.meta.env.DEV) {
    console.info(
      `[CMS] Загрузка из ${baseUrl}/items/… (в Network ищите «cms-directus», не хост Directus — прокси Vite)`,
      token ? '(токен задан)' : '(без токена)',
    )
  }

  try {
    const [projectsRes, servicesRes, stepsRes] = await Promise.all([
      directusRequest<DirectusListResponse<ProjectItem>>(PROJECTS_LIST_QUERY),
      directusRequest<DirectusListResponse<ServiceItem>>(
        '/items/services?filter[status][_eq]=published&sort=sort',
      ),
      directusRequest<DirectusListResponse<ProcessStepItem>>('/items/process_steps?sort=sort'),
    ])

    const siteContentItem = await fetchSiteContentItem()
    if (!siteContentItem) {
      return fallbackContent
    }

    return mapSiteContent(
      fallbackContent,
      siteContentItem,
      mapProjects(projectsRes.data, baseUrl, token),
      mapServices(servicesRes.data),
      mapProcessSteps(stepsRes.data),
      baseUrl,
      token,
    )
  } catch (error) {
    console.error('Failed to load CMS content, fallback to static content.', error)
    return fallbackContent
  }
}
