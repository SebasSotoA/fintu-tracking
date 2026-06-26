"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import type { DataTableColumn } from "@/components/ui/data-table"

function getColumnKeySets(columns: DataTableColumn<unknown>[]) {
  const defaultKeys: string[] = []
  const allKeys: string[] = []
  const nonToggleableKeys: string[] = []

  for (const column of columns) {
    allKeys.push(column.key)
    if (column.toggleable === false) {
      nonToggleableKeys.push(column.key)
    }
    if (column.toggleable !== false && column.defaultVisible !== false) {
      defaultKeys.push(column.key)
    }
  }

  return { defaultKeys, allKeys, nonToggleableKeys }
}

function readStoredKeys(storageKey: string): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is string => typeof item === "string")
  } catch {
    return null
  }
}

function writeStoredKeys(storageKey: string, keys: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(keys))
  } catch {
    // Ignore quota/security errors.
  }
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((value) => setB.has(value))
}

function mergeStoredKeys(
  storedKeys: string[],
  defaultKeys: string[],
  allKeys: string[],
): string[] {
  const validStored = storedKeys.filter((key) => allKeys.includes(key))
  return Array.from(new Set([...defaultKeys, ...validStored]))
}

export function usePersistedVisibleColumns<T>(
  storageKey: string,
  columns: DataTableColumn<T>[],
) {
  const { defaultKeys, allKeys, nonToggleableKeys } = useMemo(
    () => getColumnKeySets(columns as DataTableColumn<unknown>[]),
    [columns],
  )

  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => {
    const stored = readStoredKeys(storageKey)
    if (stored == null) return defaultKeys
    return mergeStoredKeys(stored, defaultKeys, allKeys)
  })

  useEffect(() => {
    const stored = readStoredKeys(storageKey)
    const merged =
      stored == null ? defaultKeys : mergeStoredKeys(stored, defaultKeys, allKeys)
    setVisibleKeys((current) => (setsEqual(current, merged) ? current : merged))
  }, [storageKey, defaultKeys, allKeys])

  useEffect(() => {
    const persisted = visibleKeys.filter((key) => !nonToggleableKeys.includes(key))
    writeStoredKeys(storageKey, persisted)
  }, [storageKey, visibleKeys, nonToggleableKeys])

  const resetVisibleKeys = useCallback(() => {
    setVisibleKeys(defaultKeys)
  }, [defaultKeys])

  const setVisibleKeysSafe = useCallback(
    (nextKeys: string[] | ((prev: string[]) => string[])) => {
      setVisibleKeys((prev) => {
        const resolved = typeof nextKeys === "function" ? nextKeys(prev) : nextKeys
        const next = new Set(resolved)
        nonToggleableKeys.forEach((key) => next.add(key))
        return Array.from(next)
      })
    },
    [nonToggleableKeys],
  )

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (column) => column.toggleable === false || visibleKeys.includes(column.key),
      ),
    [columns, visibleKeys],
  )

  return {
    visibleKeys,
    visibleColumns,
    defaultKeys,
    setVisibleKeys: setVisibleKeysSafe,
    resetVisibleKeys,
  }
}
