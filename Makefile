# SocialFlow — Canonical Go Build & Test Interface
#
# Use `make test` instead of raw `go test ./...` to guarantee
# scoped package traversal and avoid web/node_modules/.
#
# Fallback (if make is unavailable):
#   go test ./cmd/... ./internal/...
#
# Windows/PowerShell note for coverage:
#   Direct `go test -coverprofile=coverage.out -coverpkg=./cmd/...,./internal/... ./cmd/... ./internal/...`
#   may mangle the comma in -coverpkg. Use `--%` stop-parsing:
#     go --% test -coverprofile=coverage.out -coverpkg=./cmd/...,./internal/... ./cmd/... ./internal/...

GO_PACKAGES := ./cmd/... ./internal/...
COVERPKG := ./cmd/...,./internal/...

.PHONY: test vet cover cover-html race test-verbose

test:
	go test $(GO_PACKAGES)

vet:
	go vet $(GO_PACKAGES)

cover:
	go test -coverprofile=coverage.out -coverpkg=$(COVERPKG) $(GO_PACKAGES)

cover-html:
	go tool cover -html=coverage.out

race:
	go test -race -coverprofile=coverage.out -coverpkg=$(COVERPKG) $(GO_PACKAGES)

test-verbose:
	go test -v $(GO_PACKAGES)
