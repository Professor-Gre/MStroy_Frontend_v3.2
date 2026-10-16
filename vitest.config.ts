import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
    restoreMocks: true,
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
  },
}))
