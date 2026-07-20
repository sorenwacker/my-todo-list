import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // Node is the default; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` header comment.
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
})
