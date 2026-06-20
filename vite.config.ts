import type { UserConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import createVitePlugins from './config/plugins'

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const env = loadEnv(mode, process.cwd())
  process.env.NODE_ENV = mode === 'production' ? 'production' : 'development'

  return {
    base: env.VITE_BASE || '/',
    resolve: {
      alias: [
        {
          find: '~',
          replacement: fileURLToPath(new URL('./', import.meta.url)),
        },
        {
          find: '@',
          replacement: fileURLToPath(new URL('./src', import.meta.url)),
        },
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/var.scss" as *;`,
        },
      },
    },
    server: {
      open: true,
      host: true,
      // 与 edu-practice-web-vue 保持一致的子域名白名单，便于学号登录与租户子域名识别
      allowedHosts: ['.shixunfang.com', '.shixunfang.local', '.lvh.me'],
      // 开发环境通过 Vite 代理转发到 edu-gateway
      proxy: {
        '/api': {
          target: 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.url?.includes('/sse/')) {
                proxyReq.setHeader('Accept', 'text/event-stream')
                proxyReq.setHeader('Cache-Control', 'no-cache')
                proxyReq.setHeader('Connection', 'keep-alive')
              }
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              if (req.url?.includes('/sse/')) {
                proxyRes.headers['cache-control'] = 'no-cache'
                proxyRes.headers['x-accel-buffering'] = 'no'
              }
            })
          },
        },
      },
    },
    plugins: await createVitePlugins(env, command === 'build'),
    build: {
      chunkSizeWarningLimit: 2000,
      outDir: 'dist',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            'ant-design-vue': ['ant-design-vue'],
            'vendor': ['vue', 'vue-router', 'pinia', 'axios'],
          },
        },
      },
    },
    envPrefix: ['VITE'],
  }
})
