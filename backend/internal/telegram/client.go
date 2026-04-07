package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"

	"agape-backend/internal/model"
)

// Client отправляет сообщения через Bot API (пустой token = отключено).
type Client struct {
	token  string
	chatID string
	http   *http.Client
}

func New(token, chatID string) *Client {
	token = strings.TrimSpace(token)
	chatID = strings.TrimSpace(chatID)
	if token == "" || chatID == "" {
		return nil
	}
	return &Client{
		token:  token,
		chatID: chatID,
		http: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

// NotifyNewContact шлёт уведомление о новой заявке в чат.
func (c *Client) NotifyNewContact(ctx context.Context, rec *model.ContactRecord) error {
	if c == nil || rec == nil {
		return nil
	}
	text := formatContactMessage(rec)
	return c.sendMessage(ctx, text)
}

func formatContactMessage(rec *model.ContactRecord) string {
	msg := rec.Message
	if msg == "" {
		msg = "—"
	}
	// HTML-режим: экранируем пользовательский ввод
	return fmt.Sprintf(
		"<b>Новая заявка</b> #%d\n"+
			"<b>Имя:</b> %s\n"+
			"<b>Email:</b> %s\n"+
			"<b>Телефон:</b> %s\n"+
			"<b>Сообщение:</b>\n%s",
		rec.ID,
		html.EscapeString(rec.Name),
		html.EscapeString(rec.Email),
		html.EscapeString(strings.TrimSpace(rec.Phone)),
		html.EscapeString(msg),
	)
}

type sendMessageRequest struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode,omitempty"`
}

type apiResponse struct {
	OK          bool   `json:"ok"`
	Description string `json:"description,omitempty"`
}

func (c *Client) sendMessage(ctx context.Context, text string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", c.token)
	body, err := json.Marshal(sendMessageRequest{
		ChatID:    c.chatID,
		Text:      text,
		ParseMode: "HTML",
	})
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	var ar apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&ar); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	if !ar.OK {
		return fmt.Errorf("telegram api: %s", ar.Description)
	}
	return nil
}
