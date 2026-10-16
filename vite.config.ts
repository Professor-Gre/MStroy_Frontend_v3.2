import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    vue(),
  ],
})
