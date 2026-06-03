package handlers

import (
	"fmt"
	"strconv"
)

const (
	defaultPageSize = 50
	maxPageSize     = 100
	exportPageSize  = 10000
)

var allowedPageSizes = map[int]bool{25: true, 50: true, 100: true}

type paginationParams struct {
	page     int
	pageSize int
}

func parsePaginationParams(pageStr, pageSizeStr string) (paginationParams, error) {
	page := 1
	pageSize := defaultPageSize

	if pageStr != "" {
		p, err := strconv.Atoi(pageStr)
		if err != nil || p < 1 {
			return paginationParams{}, fmt.Errorf("invalid page")
		}
		page = p
	}

	if pageSizeStr != "" {
		ps, err := strconv.Atoi(pageSizeStr)
		if err != nil {
			return paginationParams{}, fmt.Errorf("invalid page_size")
		}
		if allowedPageSizes[ps] {
			pageSize = ps
		} else if ps >= 1 && ps <= exportPageSize {
			pageSize = ps
		} else {
			return paginationParams{}, fmt.Errorf("invalid page_size")
		}
	}

	return paginationParams{page: page, pageSize: pageSize}, nil
}

func paginationRequested(pageStr, pageSizeStr string) bool {
	return pageStr != "" || pageSizeStr != ""
}

func clampPage(page, total, pageSize int) int {
	if pageSize <= 0 || total <= 0 {
		return 1
	}
	totalPages := (total + pageSize - 1) / pageSize
	if totalPages < 1 {
		totalPages = 1
	}
	if page > totalPages {
		return totalPages
	}
	if page < 1 {
		return 1
	}
	return page
}

func parseExportPageSize(pageSizeStr string) (int, error) {
	if pageSizeStr == "" {
		return exportPageSize, nil
	}
	ps, err := strconv.Atoi(pageSizeStr)
	if err != nil || ps < 1 || ps > exportPageSize {
		return 0, fmt.Errorf("invalid page_size")
	}
	return ps, nil
}
