package middleware

import (
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// Logger — middleware структурированного логирования
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.status,
			"duration", time.Since(start).String(),
			"ip", r.RemoteAddr,
		)
	})
}

// RateLimiter — простой in-memory rate limiter (token bucket по IP)
func RateLimiter(rps int) func(http.Handler) http.Handler {
	type client struct {
		tokens    float64
		lastSeen  time.Time
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*client)
	)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			mu.Lock()
			c, exists := clients[ip]
			if !exists {
				c = &client{tokens: float64(rps), lastSeen: time.Now()}
				clients[ip] = c
			}

			elapsed := time.Since(c.lastSeen).Seconds()
			c.tokens += elapsed * float64(rps)
			if c.tokens > float64(rps) {
				c.tokens = float64(rps)
			}
			c.lastSeen = time.Now()

			if c.tokens < 1 {
				mu.Unlock()
				http.Error(w, `{"success":false,"error":"too many requests"}`, http.StatusTooManyRequests)
				return
			}
			c.tokens--
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}
