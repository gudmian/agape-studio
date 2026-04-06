#!/usr/bin/env node
/**
 * Исправляет колонку project_gallery.project в SQLite, если она была создана как char(36),
 * а projects.id — INTEGER (типично для Directus + SQLite). Иначе O2M merge в админке падает
 * (Page Not Found, Missing parentItem '1', …).
 *
 * Остановите Directus перед запуском.
 *
 *   node scripts/migrate-sqlite-project-gallery-fk.mjs /path/to/data.db
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const dbPath = process.argv[2]?.trim()
if (!dbPath || !existsSync(dbPath)) {
  console.error('Укажите путь к SQLite-файлу Directus, например:')
  console.error('  node scripts/migrate-sqlite-project-gallery-fk.mjs /Users/you/agape-cms-local/data.db')
  process.exit(1)
}

const sql = `
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE project_gallery_migrated (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  sort integer DEFAULT 0,
  project integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file char(36) NOT NULL REFERENCES directus_files(id) ON DELETE SET NULL
);
INSERT INTO project_gallery_migrated (id, sort, project, file)
SELECT id, sort, CAST(project AS INTEGER), file FROM project_gallery;
DROP TABLE project_gallery;
ALTER TABLE project_gallery_migrated RENAME TO project_gallery;
COMMIT;
PRAGMA foreign_keys=ON;
`

try {
  execFileSync('sqlite3', [dbPath, sql], { stdio: 'inherit' })
  console.log('OK: project_gallery.project → integer, перезапустите Directus.')
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
