import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['spec/**/*.test.ts'],
    globals: true,
  },
})
