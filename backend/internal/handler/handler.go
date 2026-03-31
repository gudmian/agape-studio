package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"agape-backend/internal/model"
	"agape-backend/internal/repository"
)

type Handler struct {
	db *repository.DB
}

func New(db *repository.DB) *Handler {
	return &Handler{db: db}
}

// Health — проверка состояния сервиса
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, model.APIResponse[map[string]string]{
		Success: true,
		Data:    map[string]string{"status": "ok"},
	})
}

// Contact — приём заявки с формы
func (h *Handler) Contact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req model.ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if err := validateContact(&req); err != "" {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	rec, err := h.db.SaveContact(&req)
	if err != nil {
		slog.Error("save contact", "err", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	slog.Info("new contact", "id", rec.ID, "email", rec.Email)

	writeJSON(w, http.StatusCreated, model.APIResponse[*model.ContactRecord]{
		Success: true,
		Data:    rec,
	})
}

// Projects — список проектов портфолио (заглушка, готово для CMS)
func (h *Handler) Projects(w http.ResponseWriter, r *http.Request) {
	projects := []model.Project{
		{ID: "apartment-minimalism", Title: "Квартира", Style: "Минимализм", Area: "85 м²", City: "Москва", Order: 1},
		{ID: "cottage-neoclassic", Title: "Коттедж", Style: "Неоклассика", Area: "180 м²", City: "Подмосковье", Order: 2},
		{ID: "office-scandinavian", Title: "Офис", Style: "Скандинавский", Area: "120 м²", City: "Центр", Order: 3},
		{ID: "penthouse-art-deco", Title: "Пентхаус", Style: "Арт Деко", Area: "220 м²", City: "Москва", Order: 4},
		{ID: "studio-loft", Title: "Студия", Style: "Лофт Минимал", Area: "60 м²", City: "СПб", Order: 5},
		{ID: "villa-provencal", Title: "Вилла", Style: "Провансаль", Area: "350 м²", City: "Подмосковье", Order: 6},
	}

	writeJSON(w, http.StatusOK, model.APIResponse[[]model.Project]{
		Success: true,
		Data:    projects,
	})
}

// Services — список услуг (заглушка, готово для CMS)
func (h *Handler) Services(w http.ResponseWriter, r *http.Request) {
	services := []model.Service{
		{
			ID: "basic", Name: "Базовый", Description: "Концепция и документация",
			Price: "от 1 500 ₽/м²", Featured: false, Order: 1,
			Features: []string{"Концептуальное решение", "Планировочные решения", "Подбор материалов", "Рабочие чертежи"},
		},
		{
			ID: "full", Name: "Полный", Description: "Сопровождение + авторский контроль",
			Price: "от 3 000 ₽/м²", Featured: true, Order: 2,
			Features: []string{"Всё из базового", "3D-визуализации", "Авторский надзор", "Помощь с закупками", "Выезды на объект"},
		},
		{
			ID: "turnkey", Name: "Под ключ", Description: "Полная реализация",
			Price: "от 5 000 ₽/м²", Featured: false, Order: 3,
			Features: []string{"Всё из полного", "Управление ремонтом", "Закупки под ключ", "Комплектация", "Гарантия результата"},
		},
	}

	writeJSON(w, http.StatusOK, model.APIResponse[[]model.Service]{
		Success: true,
		Data:    services,
	})
}

// ── Вспомогательные функции ──

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, model.APIResponse[any]{Success: false, Error: msg})
}

func validateContact(r *model.ContactRequest) string {
	r.Name = strings.TrimSpace(r.Name)
	r.Email = strings.TrimSpace(r.Email)
	r.Phone = strings.TrimSpace(r.Phone)
	r.Message = strings.TrimSpace(r.Message)

	if r.Name == "" || utf8.RuneCountInString(r.Name) < 2 {
		return "Укажите имя (минимум 2 символа)"
	}
	if r.Email == "" || !strings.Contains(r.Email, "@") {
		return "Укажите корректный email"
	}
	if utf8.RuneCountInString(r.Message) > 2000 {
		return "Сообщение слишком длинное (максимум 2000 символов)"
	}
	return ""
}
