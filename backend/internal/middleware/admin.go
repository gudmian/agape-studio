package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// BearerAdmin проверяет заголовок Authorization: Bearer <token>.
// Пустой expectedToken отключает доступ (все запросы 503 через вызывающий код — здесь 401).
func BearerAdmin(expectedToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			if expectedToken == "" {
				http.Error(w, `{"success":false,"error":"leads admin API disabled"}`, http.StatusServiceUnavailable)
				return
			}
			raw := r.Header.Get("Authorization")
			const prefix = "Bearer "
			if !strings.HasPrefix(raw, prefix) {
				http.Error(w, `{"success":false,"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			got := strings.TrimSpace(strings.TrimPrefix(raw, prefix))
			if subtle.ConstantTimeCompare([]byte(got), []byte(expectedToken)) != 1 {
				http.Error(w, `{"success":false,"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
