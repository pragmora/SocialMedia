package http

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Nico-Csk/socialflow/internal/domain"
	"github.com/Nico-Csk/socialflow/internal/service"
)

type stubAuthHandlerService struct {
	registerFn func(context.Context, domain.Credentials) (*domain.User, error)
}

func (s stubAuthHandlerService) Register(ctx context.Context, creds domain.Credentials) (*domain.User, error) {
	if s.registerFn == nil {
		return nil, fmt.Errorf("registerFn not configured")
	}

	return s.registerFn(ctx, creds)
}

func (stubAuthHandlerService) Login(context.Context, domain.Credentials) (string, *domain.User, error) {
	panic("unexpected Login call")
}

func (stubAuthHandlerService) SetAuthCookie(http.ResponseWriter, string) {
	panic("unexpected SetAuthCookie call")
}

func (stubAuthHandlerService) ClearAuthCookie(http.ResponseWriter) {
	panic("unexpected ClearAuthCookie call")
}

func TestAuthHandlerRegister_Contract(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		registerFn     func(context.Context, domain.Credentials) (*domain.User, error)
		wantStatus     int
		wantErrorCode  string
		wantErrorMsg   string
		wantUserID     string
		wantUserEmail  string
	}{
		{
			name: "duplicate registration returns conflict envelope in Spanish",
			body: `{"email":"taken@test.com","password":"secret123"}`,
			registerFn: func(context.Context, domain.Credentials) (*domain.User, error) {
				return nil, fmt.Errorf(service.ErrMsgEmailAlreadyRegistered)
			},
			wantStatus:    http.StatusConflict,
			wantErrorCode: "conflict",
			wantErrorMsg:  service.ErrMsgEmailAlreadyRegistered,
		},
		{
			name: "successful registration keeps created envelope",
			body: `{"email":"new@test.com","password":"secret123"}`,
			registerFn: func(_ context.Context, creds domain.Credentials) (*domain.User, error) {
				return &domain.User{ID: "user-1", Email: creds.Email}, nil
			},
			wantStatus:    http.StatusCreated,
			wantUserID:    "user-1",
			wantUserEmail: "new@test.com",
		},
		}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := &AuthHandler{authSvc: stubAuthHandlerService{registerFn: tt.registerFn}}

			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			handler.Register(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}

			var body struct {
				Data  *domain.User `json:"data"`
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			if tt.wantErrorCode != "" {
				if body.Data != nil {
					t.Fatalf("expected no data envelope on error, got %+v", *body.Data)
				}
				if body.Error.Code != tt.wantErrorCode {
					t.Fatalf("expected error code %q, got %q", tt.wantErrorCode, body.Error.Code)
				}
				if body.Error.Message != tt.wantErrorMsg {
					t.Fatalf("expected error message %q, got %q", tt.wantErrorMsg, body.Error.Message)
				}
				return
			}

			if body.Error.Code != "" || body.Error.Message != "" {
				t.Fatalf("expected empty error envelope on success, got %+v", body.Error)
			}

			if body.Data == nil {
				t.Fatal("expected created user data, got nil")
			}

			if body.Data.ID != tt.wantUserID {
				t.Fatalf("expected user id %q, got %q", tt.wantUserID, body.Data.ID)
			}

			if body.Data.Email != tt.wantUserEmail {
				t.Fatalf("expected user email %q, got %q", tt.wantUserEmail, body.Data.Email)
			}
		})
	}
}

var _ authHandlerService = stubAuthHandlerService{}
