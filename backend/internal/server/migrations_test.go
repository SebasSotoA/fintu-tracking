package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveMigrationsDir(t *testing.T) {
	t.Run("returns migrations when cwd is backend", func(t *testing.T) {
		root := t.TempDir()
		backend := filepath.Join(root, "backend")
		if err := os.MkdirAll(backend, 0o755); err != nil {
			t.Fatalf("mkdir backend: %v", err)
		}
		t.Chdir(backend)

		if got := ResolveMigrationsDir(); got != "migrations" {
			t.Errorf("ResolveMigrationsDir() = %q, want migrations", got)
		}
	})

	t.Run("returns backend/migrations when cwd is repo root", func(t *testing.T) {
		root := t.TempDir()
		repo := filepath.Join(root, "fintu-tracking")
		if err := os.MkdirAll(repo, 0o755); err != nil {
			t.Fatalf("mkdir repo: %v", err)
		}
		t.Chdir(repo)

		if got := ResolveMigrationsDir(); got != "backend/migrations" {
			t.Errorf("ResolveMigrationsDir() = %q, want backend/migrations", got)
		}
	})
}
