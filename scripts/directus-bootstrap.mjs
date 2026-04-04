#!/usr/bin/env node
/**
 * Создаёт коллекции и поля под фронтенд AGAPE, заливает тестовые данные из статического контента.
 *
 * Требуется запущенный Directus и учётка администратора.
 *
 * Запуск из корня репозитория:
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=admin@example.com DIRECTUS_PASSWORD=*** node scripts/directus-bootstrap.mjs
 *
 * После выполнения для локального фронта:
 *   см. frontend/.env.local.example (прокси Vite + токен).
 */

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? 'http://127.0.0.1:8055').replace(/\/$/, '')
const DIRECTUS_EMAIL = process.env.DIRECTUS_EMAIL
const DIRECTUS_PASSWORD = process.env.DIRECTUS_PASSWORD

const SITE_CONTENT_ROW = {
  meta_title: 'AGAPE — Студия авторского дизайна интерьеров',
  meta_description:
    'Авторские интерьеры, которые рассказывают вашу историю. Дизайн-проект, 3D-визуализация, авторский надзор.',
  hero_badge: 'СТУДИЯ АВТОРСКОГО ДИЗАЙНА',
  hero_headline_line1: 'Пространства,',
  hero_headline_line2: 'которые рассказывают',
  hero_subtitle: 'Создаём авторские интерьеры — от концепции до сдачи ключей',
  hero_cta_primary: 'ОБСУДИТЬ ПРОЕКТ',
  hero_cta_secondary: 'СМОТРЕТЬ РАБОТЫ',
  portfolio_eyebrow: 'ПОРТФОЛИО',
  portfolio_title: 'Наши работы',
  portfolio_subtitle:
    'Каждый проект — это история заказчика, рассказанная через пространство',
  services_eyebrow: 'УСЛУГИ',
  services_title: 'Форматы работы',
  process_eyebrow: 'КАК МЫ РАБОТАЕМ',
  process_title_line1: 'Прозрачный процесс',
  process_title_line2: 'от идеи до результата',
  process_description:
    'Каждый этап чётко выстроен, чтобы вы всегда понимали, что происходит с вашим проектом.',
  contact_eyebrow: 'СВЯЗАТЬСЯ',
  contact_title: 'Начнём ваш проект',
  contact_description: 'Обсудим ваше пространство и задачи.\nПервая консультация — бесплатно.',
  form_name_placeholder: 'Ваше имя',
  form_phone_placeholder: '+7 (___) ___-__-__',
  form_email_placeholder: 'studio@example.com',
  form_message_placeholder: 'Опишите ваш проект...',
  form_submit_label: 'ОТПРАВИТЬ ЗАЯВКУ',
  footer_copyright: '© 2024 AGAPE Studio. Авторский дизайн интерьеров',
}

const PROJECTS = [
  {
    slug: 'apartment-minimalism',
    title: 'Квартира',
    style: 'Минимализм',
    area: '85 м²',
    city: 'Москва',
    image_placeholder_dark: false,
    sort: 1,
    status: 'published',
  },
  {
    slug: 'cottage-neoclassic',
    title: 'Коттедж',
    style: 'Неоклассика',
    area: '180 м²',
    city: 'Подмосковье',
    image_placeholder_dark: false,
    sort: 2,
    status: 'published',
  },
  {
    slug: 'office-scandinavian',
    title: 'Офис',
    style: 'Скандинавский',
    area: '120 м²',
    city: 'Центр',
    image_placeholder_dark: true,
    sort: 3,
    status: 'published',
  },
  {
    slug: 'penthouse-art-deco',
    title: 'Пентхаус',
    style: 'Арт Деко',
    area: '220 м²',
    city: 'Москва',
    image_placeholder_dark: false,
    sort: 4,
    status: 'published',
  },
  {
    slug: 'studio-loft',
    title: 'Студия',
    style: 'Лофт Минимал',
    area: '60 м²',
    city: 'СПб',
    image_placeholder_dark: false,
    sort: 5,
    status: 'published',
  },
  {
    slug: 'villa-provencal',
    title: 'Вилла',
    style: 'Провансаль',
    area: '350 м²',
    city: 'Подмосковье',
    image_placeholder_dark: false,
    sort: 6,
    status: 'published',
  },
]

const SERVICES = [
  {
    slug: 'basic',
    name: 'Базовый',
    description: 'Концепция и документация',
    price: 'от 1 500 ₽/м²',
    featured: false,
    features: [
      'Концептуальное решение',
      'Планировочные решения',
      'Подбор материалов',
      'Рабочие чертежи',
    ],
    sort: 1,
    status: 'published',
  },
  {
    slug: 'full',
    name: 'Полный',
    description: 'Сопровождение + авторский контроль',
    price: 'от 3 000 ₽/м²',
    featured: true,
    features: [
      'Всё из базового',
      '3D-визуализации',
      'Авторский надзор',
      'Помощь с закупками',
      'Выезды на объект',
    ],
    sort: 2,
    status: 'published',
  },
  {
    slug: 'turnkey',
    name: 'Под ключ',
    description: 'Полная реализация',
    price: 'от 5 000 ₽/м²',
    featured: false,
    features: [
      'Всё из полного',
      'Управление ремонтом',
      'Закупки под ключ',
      'Комплектация',
      'Гарантия результата',
    ],
    sort: 3,
    status: 'published',
  },
]

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Знакомство',
    description:
      'Созвон или встреча: рассказываете о проекте, задаёте вопросы. Обсуждаем задачи, бюджет и сроки. Бесплатно.',
    sort: 1,
  },
  {
    number: '02',
    title: 'Бриф и обмеры',
    description:
      'Заполняете подробный бриф о предпочтениях и образе жизни. Выезжаю на объект для точных обмеров и фотофиксации.',
    sort: 2,
  },
  {
    number: '03',
    title: 'Концепция',
    description:
      'Разрабатываю несколько концептуальных направлений. Выбираете понравившееся и утверждаем вектор проекта.',
    sort: 3,
  },
  {
    number: '04',
    title: 'Дизайн-проект',
    description:
      'Создаю 3D-визуализации, рабочие чертежи и полную спецификацию. Вносим правки до полного согласования.',
    sort: 4,
  },
  {
    number: '05',
    title: 'Реализация',
    description:
      'Авторский надзор на каждом этапе строительства. Помогаю с закупками и сдаю готовый объект.',
    sort: 5,
  },
]

async function login() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: DIRECTUS_EMAIL,
      password: DIRECTUS_PASSWORD,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Вход в Directus не удался (${res.status}): ${JSON.stringify(body)}`)
  }
  const token = body?.data?.access_token ?? body?.data?.token
  if (!token) {
    throw new Error(`Неожиданный ответ /auth/login: ${JSON.stringify(body)}`)
  }
  return token
}

function api(token, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  }
  return fetch(`${DIRECTUS_URL}${path}`, { ...options, headers })
}

async function collectionExists(token, name) {
  const res = await api(token, `/collections/${encodeURIComponent(name)}`)
  return res.ok
}

async function ensureCollection(token, name, meta = {}) {
  if (await collectionExists(token, name)) {
    console.log(`Коллекция уже есть: ${name}`)
    return
  }
  const res = await api(token, '/collections', {
    method: 'POST',
    body: JSON.stringify({
      collection: name,
      schema: {},
      meta,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Не удалось создать коллекцию ${name} (${res.status}): ${JSON.stringify(body)}`)
  }
  console.log(`Создана коллекция: ${name}`)
}

async function listFields(token, collection) {
  const res = await api(token, `/fields/${encodeURIComponent(collection)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Не удалось прочитать поля ${collection}: ${JSON.stringify(body)}`)
  }
  return body.data ?? []
}

async function ensureField(token, collection, fieldDef) {
  const existing = await listFields(token, collection)
  if (existing.some((f) => f.field === fieldDef.field)) {
    return
  }
  const res = await api(token, `/fields/${encodeURIComponent(collection)}`, {
    method: 'POST',
    body: JSON.stringify(fieldDef),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Поле ${collection}.${fieldDef.field} (${res.status}): ${JSON.stringify(body)}`,
    )
  }
  console.log(`  + поле ${collection}.${fieldDef.field}`)
}

/**
 * File-поле через API без relation часто «ломает» админку: выбор файла из библиотеки не сохраняется.
 * Явная M2O-связь с directus_files это исправляет.
 */
async function ensureM2OFileRelation(token, manyCollection, manyField, oneCollection = 'directus_files') {
  // Directus 11: POST /relations ожидает { collection, field, related_collection } (см. api/src/controllers/relations.ts)
  const checkRes = await api(
    token,
    `/relations/${encodeURIComponent(manyCollection)}/${encodeURIComponent(manyField)}`,
  )
  const checkBody = await checkRes.json().catch(() => ({}))
  if (checkRes.ok && checkBody.data) {
    const rel = checkBody.data
    const ok =
      rel.related_collection === oneCollection ||
      rel.meta?.one_collection === oneCollection
    if (ok) return
  }

  const postRes = await api(token, '/relations', {
    method: 'POST',
    body: JSON.stringify({
      collection: manyCollection,
      field: manyField,
      related_collection: oneCollection,
      schema: {
        on_delete: 'SET NULL',
      },
    }),
  })
  const postBody = await postRes.json().catch(() => ({}))
  if (!postRes.ok) {
    console.warn(
      `Связь ${manyCollection}.${manyField} → ${oneCollection} не создана (${postRes.status}):`,
      JSON.stringify(postBody),
    )
    return
  }
  console.log(`  + связь M2O: ${manyCollection}.${manyField} → ${oneCollection}`)
}

const statusMeta = {
  interface: 'select-dropdown',
  options: {
    choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
    ],
  },
}

async function ensureSchema(token) {
  await ensureCollection(token, 'projects', { icon: 'image', note: 'Портфолио' })
  await ensureField(token, 'projects', {
    field: 'slug',
    type: 'string',
    meta: { interface: 'input', required: true, note: 'URL-идентификатор (латиница)' },
    schema: { is_nullable: false, is_unique: true, max_length: 255 },
  })
  await ensureField(token, 'projects', {
    field: 'title',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 255 },
  })
  await ensureField(token, 'projects', {
    field: 'style',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 255 },
  })
  await ensureField(token, 'projects', {
    field: 'area',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 64 },
  })
  await ensureField(token, 'projects', {
    field: 'city',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 255 },
  })
  await ensureField(token, 'projects', {
    field: 'image',
    type: 'uuid',
    meta: { interface: 'file-image', special: ['file'] },
    schema: {
      is_nullable: true,
      foreign_key_table: 'directus_files',
      foreign_key_column: 'id',
    },
  })
  await ensureM2OFileRelation(token, 'projects', 'image')
  await ensureField(token, 'projects', {
    field: 'image_placeholder_dark',
    type: 'boolean',
    meta: { interface: 'boolean', note: 'Тёмный плейсхолдер карточки' },
    schema: { is_nullable: true, default_value: false },
  })
  await ensureField(token, 'projects', {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false },
  })
  await ensureField(token, 'projects', {
    field: 'status',
    type: 'string',
    meta: { ...statusMeta, required: true },
    schema: { is_nullable: false, default_value: 'published', max_length: 32 },
  })

  await ensureCollection(token, 'services', { icon: 'sell', note: 'Услуги / тарифы' })
  await ensureField(token, 'services', {
    field: 'slug',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, is_unique: true, max_length: 255 },
  })
  await ensureField(token, 'services', {
    field: 'name',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 255 },
  })
  await ensureField(token, 'services', {
    field: 'description',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 500 },
  })
  await ensureField(token, 'services', {
    field: 'price',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 128 },
  })
  await ensureField(token, 'services', {
    field: 'featured',
    type: 'boolean',
    meta: { interface: 'boolean' },
    schema: { is_nullable: true, default_value: false },
  })
  await ensureField(token, 'services', {
    field: 'features',
    type: 'json',
    meta: { interface: 'input-code', note: 'JSON-массив строк, например ["a","b"]' },
    schema: { is_nullable: true },
  })
  await ensureField(token, 'services', {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false },
  })
  await ensureField(token, 'services', {
    field: 'status',
    type: 'string',
    meta: { ...statusMeta, required: true },
    schema: { is_nullable: false, default_value: 'published', max_length: 32 },
  })

  await ensureCollection(token, 'process_steps', { icon: 'format_list_numbered', note: 'Этапы работы' })
  await ensureField(token, 'process_steps', {
    field: 'number',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 8 },
  })
  await ensureField(token, 'process_steps', {
    field: 'title',
    type: 'string',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false, max_length: 255 },
  })
  await ensureField(token, 'process_steps', {
    field: 'description',
    type: 'text',
    meta: { interface: 'input-multiline', required: true },
    schema: { is_nullable: false },
  })
  await ensureField(token, 'process_steps', {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', required: true },
    schema: { is_nullable: false },
  })

  await ensureCollection(token, 'site_content', { icon: 'web', singleton: true, note: 'Тексты сайта' })

  await ensureField(token, 'site_content', {
    field: 'hero_background_image',
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Фон Hero — топовая работа (изображение)',
    },
    schema: {
      is_nullable: true,
      foreign_key_table: 'directus_files',
      foreign_key_column: 'id',
    },
  })
  await ensureM2OFileRelation(token, 'site_content', 'hero_background_image')

  const textField = (field, note) => ({
    field,
    type: 'string',
    meta: { interface: 'input', required: true, note },
    schema: { is_nullable: false, max_length: 500 },
  })
  const longText = (field, note) => ({
    field,
    type: 'text',
    meta: { interface: 'input-multiline', required: true, note },
    schema: { is_nullable: false },
  })

  for (const f of [
    textField('meta_title', 'Meta title'),
    longText('meta_description', 'Meta description'),
    textField('hero_badge', ''),
    textField('hero_headline_line1', 'Первая строка заголовка'),
    textField('hero_headline_line2', 'Вторая строка заголовка'),
    longText('hero_subtitle', ''),
    textField('hero_cta_primary', ''),
    textField('hero_cta_secondary', ''),
    textField('portfolio_eyebrow', ''),
    textField('portfolio_title', ''),
    longText('portfolio_subtitle', ''),
    textField('services_eyebrow', ''),
    textField('services_title', ''),
    textField('process_eyebrow', ''),
    textField('process_title_line1', ''),
    textField('process_title_line2', ''),
    longText('process_description', ''),
    textField('contact_eyebrow', ''),
    textField('contact_title', ''),
    longText('contact_description', 'Поддерживается перенос строки \\n'),
    textField('form_name_placeholder', ''),
    textField('form_phone_placeholder', ''),
    textField('form_email_placeholder', ''),
    textField('form_message_placeholder', ''),
    textField('form_submit_label', ''),
    textField('footer_copyright', ''),
  ]) {
    await ensureField(token, 'site_content', f)
  }
}

async function findItemBySlug(token, collection, slug) {
  const q = new URLSearchParams({
    'filter[slug][_eq]': slug,
    limit: '1',
    fields: 'id,slug',
  })
  const res = await api(token, `/items/${collection}?${q}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return null
  const row = body.data?.[0]
  return row?.id ?? null
}

async function upsertBySlug(token, collection, slug, payload) {
  const id = await findItemBySlug(token, collection, slug)
  if (id != null) {
    const res = await api(token, `/items/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`PATCH ${collection}/${slug} (${res.status}): ${JSON.stringify(body)}`)
    }
    return
  }
  const res = await api(token, `/items/${collection}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`POST ${collection}/${slug} (${res.status}): ${JSON.stringify(body)}`)
  }
}

async function findProcessStep(token, number) {
  const q = new URLSearchParams({
    'filter[number][_eq]': number,
    limit: '1',
    fields: 'id,number',
  })
  const res = await api(token, `/items/process_steps?${q}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return null
  const row = body.data?.[0]
  return row?.id ?? null
}

async function upsertProcessStep(token, row) {
  const id = await findProcessStep(token, row.number)
  if (id != null) {
    const res = await api(token, `/items/process_steps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(row),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`PATCH process_steps ${row.number} (${res.status}): ${JSON.stringify(body)}`)
    }
    return
  }
  const res = await api(token, '/items/process_steps', {
    method: 'POST',
    body: JSON.stringify(row),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`POST process_steps ${row.number} (${res.status}): ${JSON.stringify(body)}`)
  }
}

async function readErrorBody(res) {
  return res.json().catch(() => ({}))
}

/**
 * Разные сборки Directus по-разному обходятся с singleton (…/singleton есть не везде).
 */
async function seedSingleton(token) {
  const row = SITE_CONTENT_ROW

  const attempts = []

  const ok = (res) => res.ok

  // 1) Документация Directus 11: PATCH …/singleton
  {
    const res = await api(token, '/items/site_content/singleton', {
      method: 'PATCH',
      body: JSON.stringify(row),
    })
    if (ok(res)) {
      console.log('Записан site_content: PATCH /items/site_content/singleton')
      return
    }
    attempts.push(['PATCH /items/site_content/singleton', res.status, await readErrorBody(res)])
  }

  // 2) PATCH на коллекцию без id (встречается у части версий)
  for (const body of [JSON.stringify(row), JSON.stringify({ data: row })]) {
    const res = await api(token, '/items/site_content', {
      method: 'PATCH',
      body,
    })
    if (ok(res)) {
      console.log('Записан site_content: PATCH /items/site_content')
      return
    }
    attempts.push(['PATCH /items/site_content', res.status, await readErrorBody(res)])
  }

  // 3) GET и PATCH по первичному ключу
  {
    const res = await api(token, '/items/site_content')
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.data != null) {
      const d = body.data
      const id = Array.isArray(d) ? d[0]?.id : d.id
      if (id != null) {
        for (const payload of [JSON.stringify(row), JSON.stringify({ data: row })]) {
          const pr = await api(token, `/items/site_content/${id}`, {
            method: 'PATCH',
            body: payload,
          })
          if (ok(pr)) {
            console.log(`Записан site_content: PATCH /items/site_content/${id}`)
            return
          }
          attempts.push([`PATCH /items/site_content/${id}`, pr.status, await readErrorBody(pr)])
        }
      }
    } else if (!res.ok) {
      attempts.push(['GET /items/site_content', res.status, body])
    }
  }

  // 4) Создание записи (если singleton ещё без строки в БД)
  for (const payload of [
    JSON.stringify({ data: row }),
    JSON.stringify(row),
    JSON.stringify({ data: [row] }),
  ]) {
    const res = await api(token, '/items/site_content', {
      method: 'POST',
      body: payload,
    })
    if (ok(res)) {
      console.log('Записан site_content: POST /items/site_content')
      return
    }
    attempts.push(['POST /items/site_content', res.status, await readErrorBody(res)])
  }

  const summary = attempts.map(([path, status, err]) => `${path} → ${status}: ${JSON.stringify(err)}`).join('\n')
  throw new Error(`Не удалось записать site_content ни одним способом.\n${summary}`)
}

async function seedData(token) {
  for (const p of PROJECTS) {
    await upsertBySlug(token, 'projects', p.slug, p)
  }
  console.log(`Проекты: ${PROJECTS.length} записей (upsert по slug)`)

  for (const s of SERVICES) {
    await upsertBySlug(token, 'services', s.slug, s)
  }
  console.log(`Услуги: ${SERVICES.length} записей (upsert по slug)`)

  for (const step of PROCESS_STEPS) {
    await upsertProcessStep(token, step)
  }
  console.log(`Этапы: ${PROCESS_STEPS.length} записей (upsert по number)`)

  await seedSingleton(token)
}

async function main() {
  if (!DIRECTUS_EMAIL || !DIRECTUS_PASSWORD) {
    console.error(
      'Укажите DIRECTUS_EMAIL и DIRECTUS_PASSWORD (учётка администратора Directus).\nПример:\n  DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=admin@example.com DIRECTUS_PASSWORD=secret node scripts/directus-bootstrap.mjs',
    )
    process.exit(1)
  }

  console.log(`Directus: ${DIRECTUS_URL}`)
  const token = await login()
  await ensureSchema(token)
  await seedData(token)

  console.log('\nГотово.')
  console.log(
    'Для локального фронта: скопируйте frontend/.env.local.example → frontend/.env.local и вставьте VITE_CMS_TOKEN (рекомендуется Static Token из админки Directus).',
  )
  console.log(
    'В Directus 11 проще всего: Settings → Access Tokens → создать токен с правами чтения нужных коллекций (или временно Admin для dev).',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
