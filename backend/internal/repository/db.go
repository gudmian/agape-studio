package repository

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"

	"agape-backend/internal/model"
)

type DB struct {
	conn *sql.DB
}

func New(dsn string) (*DB, error) {
	// Создаём директорию для БД если не существует
	dir := filepath.Dir(dsn)
	if dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("create db dir: %w", err)
		}
	}

	conn, err := sql.Open("sqlite3", dsn+"?_journal_mode=WAL&_busy_timeout=5000")
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
	_, err := db.conn.Exec(`
		CREATE TABLE IF NOT EXISTS contact_requests (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			name       TEXT    NOT NULL,
			phone      TEXT    NOT NULL DEFAULT '',
			email      TEXT    NOT NULL,
			message    TEXT    NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	return err
}

// SaveContact сохраняет заявку в БД
func (db *DB) SaveContact(r *model.ContactRequest) (*model.ContactRecord, error) {
	res, err := db.conn.Exec(
		`INSERT INTO contact_requests (name, phone, email, message) VALUES (?, ?, ?, ?)`,
		r.Name, r.Phone, r.Email, r.Message,
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
		`SELECT id, name, phone, email, message, created_at FROM contact_requests WHERE id = ?`, id,
	)

	var rec model.ContactRecord
	if err := row.Scan(&rec.ID, &rec.Name, &rec.Phone, &rec.Email, &rec.Message, &rec.CreatedAt); err != nil {
		return nil, fmt.Errorf("scan contact: %w", err)
	}

	return &rec, nil
}
