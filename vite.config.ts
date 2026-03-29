/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_PAGES ? '/update-sim/' : '/',
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
