package model

import "time"

// ContactRequest — входящая заявка с формы сайта
type ContactRequest struct {
	Name    string `json:"name"    validate:"required,min=2,max=100"`
	Phone   string `json:"phone"   validate:"max=20"`
	Email   string `json:"email"   validate:"required,email,max=200"`
	Message string `json:"message" validate:"max=2000"`
}

// ContactRecord — запись в БД
type ContactRecord struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

// APIResponse — стандартный конверт ответа
type APIResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Project — проект портфолио (CMS-ready)
type Project struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Style       string `json:"style"`
	Area        string `json:"area"`
	City        string `json:"city"`
	ImageURL    string `json:"image_url,omitempty"`
	Description string `json:"description,omitempty"`
	Order       int    `json:"order"`
}

// Service — услуга (CMS-ready)
type Service struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Price       string   `json:"price"`
	Featured    bool     `json:"featured"`
	Features    []string `json:"features"`
	Order       int      `json:"order"`
}
