package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"agape-backend/internal/model"
)

type DB struct {
	conn *sql.DB
}

func New(dsn string) (*DB, error) {
	dir := filepath.Dir(dsn)
	if dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("create db dir: %w", err)
		}
	}

	conn, err := sql.Open("sqlite", dsn+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) migrate() error {
	if _, err := db.conn.Exec(`
		CREATE TABLE IF NOT EXISTS contact_requests (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			name       TEXT    NOT NULL,
			phone      TEXT    NOT NULL DEFAULT '',
			email      TEXT    NOT NULL,
			message    TEXT    NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`); err != nil {
		return err
	}
	return db.ensureLeadColumns()
}

func (db *DB) ensureLeadColumns() error {
	cols, err := db.columnSet("contact_requests")
	if err != nil {
		return err
	}
	alters := []struct {
		name string
		sql  string
	}{
		{"status", `ALTER TABLE contact_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`},
		{"notes", `ALTER TABLE contact_requests ADD COLUMN notes TEXT NOT NULL DEFAULT ''`},
		{"updated_at", `ALTER TABLE contact_requests ADD COLUMN updated_at DATETIME`},
	}
	for _, a := range alters {
		if cols[a.name] {
			continue
		}
		if _, err := db.conn.Exec(a.sql); err != nil {
			return fmt.Errorf("alter add %s: %w", a.name, err)
		}
	}
	return nil
}

func (db *DB) columnSet(table string) (map[string]bool, error) {
	if table != "contact_requests" {
		return nil, fmt.Errorf("unsupported table")
	}
	rows, err := db.conn.Query(`PRAGMA table_info(contact_requests)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]bool)
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return nil, err
		}
		out[strings.ToLower(name)] = true
	}
	return out, rows.Err()
}

// SaveContact сохраняет заявку в БД
func (db *DB) SaveContact(r *model.ContactRequest) (*model.ContactRecord, error) {
	res, err := db.conn.Exec(
		`INSERT INTO contact_requests (name, phone, email, message, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
		r.Name, r.Phone, r.Email, r.Message, model.LeadStatusNew, "",
	)
	if err != nil {
		return nil, fmt.Errorf("insert contact: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}

	return db.GetContactByID(id)
}

// GetContactByID возвращает запись по ID
func (db *DB) GetContactByID(id int64) (*model.ContactRecord, error) {
	row := db.conn.QueryRow(
		`SELECT id, name, phone, email, message, status, notes, created_at, updated_at FROM contact_requests WHERE id = ?`, id,
	)
	return scanContactRecord(row)
}

// ListLeads — список заявок с фильтром по статусу и пагинацией
func (db *DB) ListLeads(status string, limit, offset int) ([]model.ContactRecord, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var (
		rows *sql.Rows
		err  error
	)
	status = strings.TrimSpace(strings.ToLower(status))
	if status != "" {
		rows, err = db.conn.Query(
			`SELECT id, name, phone, email, message, status, notes, created_at, updated_at FROM contact_requests
			 WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
			status, limit, offset,
		)
	} else {
		rows, err = db.conn.Query(
			`SELECT id, name, phone, email, message, status, notes, created_at, updated_at FROM contact_requests
			 ORDER BY id DESC LIMIT ? OFFSET ?`,
			limit, offset,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("query leads: %w", err)
	}
	defer rows.Close()

	var list []model.ContactRecord
	for rows.Next() {
		rec, err := scanContactRecordRows(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *rec)
	}
	return list, rows.Err()
}

// UpdateLead обновляет статус и/или заметки
func (db *DB) UpdateLead(id int64, patch *model.LeadPatchRequest) (*model.ContactRecord, error) {
	rec, err := db.GetLead(id)
	if err != nil {
		return nil, err
	}

	newStatus := rec.Status
	if patch.Status != nil {
		newStatus = strings.TrimSpace(*patch.Status)
	}
	newNotes := rec.Notes
	if patch.Notes != nil {
		newNotes = *patch.Notes
	}

	_, err = db.conn.Exec(
		`UPDATE contact_requests SET status = ?, notes = ?, updated_at = ? WHERE id = ?`,
		newStatus, newNotes, time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return nil, fmt.Errorf("update lead: %w", err)
	}

	return db.GetContactByID(id)
}

func scanContactRecord(row *sql.Row) (*model.ContactRecord, error) {
	var rec model.ContactRecord
	var updatedAt sql.NullString
	if err := row.Scan(&rec.ID, &rec.Name, &rec.Phone, &rec.Email, &rec.Message, &rec.Status, &rec.Notes, &rec.CreatedAt, &updatedAt); err != nil {
		return nil, err
	}
	if updatedAt.Valid && updatedAt.String != "" {
		t, err := time.Parse(time.RFC3339, updatedAt.String)
		if err == nil {
			rec.UpdatedAt = &t
		}
	}
	if rec.Status == "" {
		rec.Status = model.LeadStatusNew
	}
	return &rec, nil
}

// ErrLeadNotFound — заявка не найдена
var ErrLeadNotFound = errors.New("lead not found")

// GetLead возвращает заявку или ErrLeadNotFound
func (db *DB) GetLead(id int64) (*model.ContactRecord, error) {
	rec, err := db.GetContactByID(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	return rec, nil
}

func scanContactRecordRows(rows *sql.Rows) (*model.ContactRecord, error) {
	var rec model.ContactRecord
	var updatedAt sql.NullString
	if err := rows.Scan(&rec.ID, &rec.Name, &rec.Phone, &rec.Email, &rec.Message, &rec.Status, &rec.Notes, &rec.CreatedAt, &updatedAt); err != nil {
		return nil, fmt.Errorf("scan contact: %w", err)
	}
	if updatedAt.Valid && updatedAt.String != "" {
		t, err := time.Parse(time.RFC3339, updatedAt.String)
		if err == nil {
			rec.UpdatedAt = &t
		}
	}
	if rec.Status == "" {
		rec.Status = model.LeadStatusNew
	}
	return &rec, nil
}
