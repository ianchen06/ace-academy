import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      unstubEnvs: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx',
          'src/vite-env.d.ts',
          // Static curriculum content: no branches to exercise. Its shape is
          // guarded by src/data/data.test.ts instead of by coverage.
          'src/data/**',
          'src/test/**',
          'src/**/*.test.{ts,tsx}',
        ],
        thresholds: {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
      },
    },
  }),
)
