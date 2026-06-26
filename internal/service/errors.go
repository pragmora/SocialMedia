package service

import "fmt"

const (
	ErrMsgEmailAlreadyRegistered = "el correo ya está registrado"
	ErrMsgContentItemNotFound = "elemento de contenido no encontrado"
	ErrMsgTaskNotFound        = "tarea no encontrada"
	ErrMsgCommentNotFound     = "comentario no encontrado"
	ErrMsgWorkspaceNotFound   = "espacio de trabajo no encontrado"
	ErrMsgInviteNotFound      = "invitacion no encontrada"
	ErrMsgInviteUnavailable   = "la invitacion expiro o no tiene usos disponibles"
	ErrMsgAdminRoleRequired   = "se requiere rol de administrador"
)

// InvalidReferenceError is returned when a store-layer FK guard rejects a
// workspace-scoped reference (client_id, content_item_id, assignee_id).
// The Field property identifies which reference was invalid.
type InvalidReferenceError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *InvalidReferenceError) Error() string {
	return fmt.Sprintf("referencia invalida para %s: %s", e.Field, e.Message)
}

// InvalidEnumError is returned when a create/update/transition request
// provides a platform, content_type, or status value that is not in the
// domain's canonical enum sets.
type InvalidEnumError struct {
	Field   string   `json:"field"`
	Value   string   `json:"value"`
	Allowed []string `json:"allowed"`
}

func (e *InvalidEnumError) Error() string {
	return fmt.Sprintf("valor inválido para %s: %q (permitidos: %v)", e.Field, e.Value, e.Allowed)
}

// InvalidFormatError is returned when a string field does not match the
// expected format (e.g., YYYY-MM-DD for date fields). Handlers map this
// to HTTP 400 with code "invalid_format".
type InvalidFormatError struct {
	Field    string `json:"field"`
	Value    string `json:"value"`
	Expected string `json:"expected"`
}

func (e *InvalidFormatError) Error() string {
	return fmt.Sprintf("formato inválido para %s: %q (se espera %s)", e.Field, e.Value, e.Expected)
}
