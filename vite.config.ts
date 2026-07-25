import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aceContent } from './plugins/aceContent'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [aceContent(), react()],
})
