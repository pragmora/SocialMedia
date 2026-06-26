package service

import (
	"testing"

	"github.com/Nico-Csk/socialflow/internal/domain"
)

func TestValidateRegistrationPreconditions(t *testing.T) {
	tests := []struct {
		name     string
		creds    domain.Credentials
		existing *domain.User
		wantErr  string
	}{
		{
			name:    "missing email or password returns Spanish validation message",
			creds:   domain.Credentials{},
			wantErr: "correo y contraseña son obligatorios",
		},
		{
			name: "duplicate email returns Spanish conflict message",
			creds: domain.Credentials{Email: "taken@test.com", Password: "secret123"},
			existing: &domain.User{ID: "user-1", Email: "taken@test.com"},
			wantErr:  "el correo ya está registrado",
		},
		{
			name:    "new credentials with no existing user succeed",
			creds:   domain.Credentials{Email: "new@test.com", Password: "secret123"},
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRegistrationPreconditions(tt.creds, tt.existing)

			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("expected nil error, got %v", err)
				}
				return
			}

			if err == nil {
				t.Fatalf("expected error %q, got nil", tt.wantErr)
			}

			if err.Error() != tt.wantErr {
				t.Fatalf("expected error %q, got %q", tt.wantErr, err.Error())
			}
		})
	}
}
