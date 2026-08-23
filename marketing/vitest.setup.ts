import { JSDOM } from 'jsdom'
import '@testing-library/jest-dom/vitest'

class MockIntersectionObserver {
  cb: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.cb = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const g = globalThis as unknown as Record<string, unknown>
g.IntersectionObserver = MockIntersectionObserver
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!g.matchMedia) {
  g.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })
}

export { JSDOM }