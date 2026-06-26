import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePersistedVisibleColumns } from "./use-persisted-visible-columns"
import type { DataTableColumn } from "@/components/ui/data-table"

const columns: DataTableColumn<unknown>[] = [
  { key: "a", header: "A", cell: () => "A", label: "Alpha" },
  { key: "b", header: "B", cell: () => "B", label: "Beta", defaultVisible: false },
  { key: "c", header: "C", cell: () => "C", label: "Gamma", toggleable: false },
]

const storageKey = "test-columns"

describe("usePersistedVisibleColumns", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("uses default visibility when localStorage is empty", () => {
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    expect(result.current.visibleKeys).toEqual(["a"])
    expect(result.current.visibleColumns.map((c) => c.key)).toEqual(["a", "c"])
  })

  it("reads valid stored keys from localStorage", () => {
    localStorage.setItem(storageKey, JSON.stringify(["a", "b"]))
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    expect(result.current.visibleKeys).toEqual(["a", "b"])
    expect(result.current.visibleColumns.map((c) => c.key)).toEqual(["a", "b", "c"])
  })

  it("drops stale keys and adds new default-visible keys", () => {
    localStorage.setItem(storageKey, JSON.stringify(["a", "old-key"]))
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    expect(result.current.visibleKeys).toEqual(["a"])
    expect(result.current.visibleKeys).not.toContain("old-key")
    expect(result.current.visibleColumns.map((c) => c.key)).toEqual(["a", "c"])
  })

  it("keeps non-toggleable columns visible even when omitted from keys", () => {
    localStorage.setItem(storageKey, JSON.stringify(["a"]))
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    expect(result.current.visibleKeys).not.toContain("c")
    expect(result.current.visibleColumns.map((c) => c.key)).toContain("c")
  })

  it("writes changes back to localStorage", () => {
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    act(() => {
      result.current.setVisibleKeys(["a", "b", "c"])
    })
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(["a", "b"]))
  })

  it("reset restores default visibility", () => {
    localStorage.setItem(storageKey, JSON.stringify(["a", "b", "c"]))
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    act(() => {
      result.current.resetVisibleKeys()
    })
    expect(result.current.visibleKeys).toEqual(["a"])
    expect(result.current.visibleColumns.map((c) => c.key)).toEqual(["a", "c"])
  })

  it("does not break when localStorage is unavailable", () => {
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error("storage disabled")
    }
    const { result } = renderHook(() => usePersistedVisibleColumns(storageKey, columns))
    expect(result.current.visibleKeys).toEqual(["a"])
    expect(result.current.visibleColumns.map((c) => c.key)).toEqual(["a", "c"])
    Storage.prototype.getItem = originalGetItem
  })
})
