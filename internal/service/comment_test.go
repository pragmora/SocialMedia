package service

import "testing"

func TestCommentCreate_RejectsEmptyBodyInSpanish(t *testing.T) {
	svc := &CommentService{}

	_, err := svc.Create(nil, "ws-1", "ci-1", "user-1", "")
	if err == nil {
		t.Fatal("expected error for empty comment body, got nil")
	}

	if err.Error() != "el comentario es obligatorio" {
		t.Fatalf("expected Spanish validation message, got %q", err.Error())
	}
}
