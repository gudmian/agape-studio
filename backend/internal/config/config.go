package config

import (
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	CORSOrigins       string
	Env               string
	TelegramBotToken  string
	TelegramChatID    string
	LeadsAdminToken   string
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		DatabaseURL:      getEnv("DATABASE_URL", "./data/agape.db"),
		CORSOrigins:      getEnv("CORS_ORIGINS", "http://localhost:5173"),
		Env:              getEnv("ENV", "development"),
		TelegramBotToken: getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:   getEnv("TELEGRAM_CHAT_ID", ""),
		LeadsAdminToken:  getEnv("LEADS_ADMIN_TOKEN", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}
