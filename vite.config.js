import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
//
// `base` must match the GitHub Pages project path:
//   https://<user>.github.io/AstroBlaster/
//
// React Compiler (React 19) is wired through @rolldown/plugin-babel +
// reactCompilerPreset — the official path for the Rolldown-based plugin-react.
// No `target` is passed, so it defaults to React 19 (`react/compiler-runtime`).
export default defineConfig({
  base: '/AstroBlaster/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
