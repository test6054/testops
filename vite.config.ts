import type { UserConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
import createVitePlugins from './config/plugins'

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const env = loadEnv(mode, process.cwd())
  process.env.NODE_ENV = mode === 'production' ? 'production' : 'development'
  const analyze = process.env.ANALYZE === 'true'

  return {
    base: env.VITE_BASE || '/',
    resolve: {
      alias: [
        {
          find: /^@vue-office\/docx$/,
          replacement: fileURLToPath(
            new URL('./node_modules/@vue-office/docx/lib/v3/vue-office-docx.mjs', import.meta.url),
          ),
        },
        {
          find: /^@vue-office\/excel$/,
          replacement: fileURLToPath(
            new URL(
              './node_modules/@vue-office/excel/lib/v3/vue-office-excel.mjs',
              import.meta.url,
            ),
          ),
        },
        {
          find: /^@vue-office\/pptx$/,
          replacement: fileURLToPath(
            new URL('./node_modules/@vue-office/pptx/lib/v3/vue-office-pptx.mjs', import.meta.url),
          ),
        },
        {
          find: /^@vue-office\/docx\/lib\/index\.css$/,
          replacement: fileURLToPath(
            new URL('./node_modules/@vue-office/docx/lib/v3/index.css', import.meta.url),
          ),
        },
        {
          find: /^@vue-office\/excel\/lib\/index\.css$/,
          replacement: fileURLToPath(
            new URL('./node_modules/@vue-office/excel/lib/v3/index.css', import.meta.url),
          ),
        },
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
    plugins: [
      ...(await createVitePlugins(command === 'build')),
      // ANALYZE=true 时生成 dist/stats.html；默认不自动打开浏览器
      ...(command === 'build'
        ? [
            visualizer({
              open: analyze,
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    optimizeDeps: {
      // echarts / vue-echarts / pdfjs-dist 不进入预构建白名单，避免开发态与首屏被图表/PDF 引擎拖住
      // 重引擎不进 optimizeDeps：konva/aieditor/vue-office 仅业务路径动态 import，避免开发预构建拖慢冷启动
      include: [
        'vue-draggable-plus',
        'lodash-es',
        '@vueuse/core',
        'axios',
        'pinia',
        'dayjs',
        'crypto-js',
        'dompurify',
      ],
    },
    build: {
      chunkSizeWarningLimit: 500,
      outDir: 'dist',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          // 重引擎单独命名便于缓存；antd/icons 不强制整包合并，按路由真实引用拆分以压首屏
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined
            }
            if (id.includes('echarts') || id.includes('vue-echarts')) {
              return 'echarts'
            }
            if (id.includes('vue-konva') || id.includes('/konva/')) {
              return 'konva'
            }
            if (id.includes('aieditor')) {
              return 'aieditor'
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdf'
            }
            if (
              id.includes('@vue-office/')
              || id.includes('/vue-office/')
            ) {
              // office 预览仅 FilePreview 动态导入，保持独立大包不污染业务 chunk
              if (id.includes('excel')) return 'vue-office-excel'
              if (id.includes('pptx')) return 'vue-office-pptx'
              if (id.includes('docx')) return 'vue-office-docx'
              return 'vue-office'
            }
            if (
              id.includes('/vue/')
              || id.includes('vue-router')
              || id.includes('/pinia')
              || id.includes('/axios/')
              || id.includes('lodash-es')
              || id.includes('/dayjs/')
            ) {
              return 'vendor'
            }
            return undefined
          },
        },
      },
    },
    envPrefix: ['VITE'],
  }
})
