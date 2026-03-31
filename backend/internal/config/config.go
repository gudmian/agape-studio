package config

import (
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	CORSOrigins string
	Env         string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "./data/agape.db"),
		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:5173"),
		Env:         getEnv("ENV", "development"),
	}
}

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}
