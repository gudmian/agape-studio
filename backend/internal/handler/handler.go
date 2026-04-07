package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"

	"agape-backend/internal/model"
	"agape-backend/internal/repository"
	"agape-backend/internal/telegram"
)

type Handler struct {
	db *repository.DB
	tg *telegram.Client
}

func New(db *repository.DB, tg *telegram.Client) *Handler {
	return &Handler{db: db, tg: tg}
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

	if h.tg != nil {
		go h.notifyTelegram(rec)
	}

	writeJSON(w, http.StatusCreated, model.APIResponse[*model.ContactRecord]{
		Success: true,
		Data:    rec,
	})
}

func (h *Handler) notifyTelegram(rec *model.ContactRecord) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := h.tg.NotifyNewContact(ctx, rec); err != nil {
		slog.Error("telegram notify", "err", err, "lead_id", rec.ID)
	}
}

// ListLeads — список заявок (админ)
func (h *Handler) ListLeads(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	limit := queryInt(r, "limit", 50)
	offset := queryInt(r, "offset", 0)

	if status != "" && !validLeadStatus(status) {
		writeError(w, http.StatusBadRequest, "некорректный status")
		return
	}

	list, err := h.db.ListLeads(status, limit, offset)
	if err != nil {
		slog.Error("list leads", "err", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, model.APIResponse[[]model.ContactRecord]{
		Success: true,
		Data:    list,
	})
}

// GetLead — одна заявка (админ)
func (h *Handler) GetLead(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "некорректный id")
		return
	}

	rec, err := h.db.GetLead(id)
	if err != nil {
		if errors.Is(err, repository.ErrLeadNotFound) {
			writeError(w, http.StatusNotFound, "не найдено")
			return
		}
		slog.Error("get lead", "err", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, model.APIResponse[*model.ContactRecord]{
		Success: true,
		Data:    rec,
	})
}

// PatchLead — обновление статуса / заметок (админ)
func (h *Handler) PatchLead(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "некорректный id")
		return
	}

	var patch model.LeadPatchRequest
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if msg := validateLeadPatch(&patch); msg != "" {
		writeError(w, http.StatusUnprocessableEntity, msg)
		return
	}

	rec, err := h.db.UpdateLead(id, &patch)
	if err != nil {
		if errors.Is(err, repository.ErrLeadNotFound) {
			writeError(w, http.StatusNotFound, "не найдено")
			return
		}
		slog.Error("patch lead", "err", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, model.APIResponse[*model.ContactRecord]{
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

func validLeadStatus(s string) bool {
	switch strings.TrimSpace(strings.ToLower(s)) {
	case model.LeadStatusNew, model.LeadStatusInProgress, model.LeadStatusDone, model.LeadStatusArchived:
		return true
	default:
		return false
	}
}

func validateLeadPatch(p *model.LeadPatchRequest) string {
	if p.Status == nil && p.Notes == nil {
		return "Укажите status и/или notes"
	}
	if p.Status != nil {
		s := strings.TrimSpace(*p.Status)
		if s == "" || !validLeadStatus(s) {
			return "Некорректный status (new, in_progress, done, archived)"
		}
		*p.Status = strings.ToLower(s)
	}
	if p.Notes != nil && utf8.RuneCountInString(*p.Notes) > 5000 {
		return "Заметка слишком длинная (максимум 5000 символов)"
	}
	return ""
}

func queryInt(r *http.Request, key string, def int) int {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return n
}

func parseIDParam(s string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(s), 10, 64)
}
