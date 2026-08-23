import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof getViteConfig>[0])