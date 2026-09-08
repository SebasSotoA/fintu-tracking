package handlers

import (
	"fmt"
	"strings"
)

type listSort struct {
	column string
	dir    string
}

func parseListSort(sortKey, dirKey string, allowed map[string]string) listSort {
	column, ok := allowed[strings.ToLower(strings.TrimSpace(sortKey))]
	if !ok || !isSafeSQLIdent(column) {
		column = "date"
	}

	dir := "DESC"
	if strings.ToLower(strings.TrimSpace(dirKey)) == "asc" {
		dir = "ASC"
	}

	return listSort{column: column, dir: dir}
}

func (s listSort) orderByClause() string {
	column := s.column
	if !isSafeSQLIdent(column) {
		column = "date"
	}
	dir := "DESC"
	if s.dir == "ASC" {
		dir = "ASC"
	}
	return fmt.Sprintf(" ORDER BY %s %s, created_at DESC, id DESC", column, dir)
}

func isSafeSQLIdent(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'a' && c <= 'z' {
			continue
		}
		if i > 0 && (c == '_' || (c >= '0' && c <= '9')) {
			continue
		}
		return false
	}
	return true
}
