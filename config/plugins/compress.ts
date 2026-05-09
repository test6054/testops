import type { Plugin } from 'vite'
import { compression } from 'vite-plugin-compression2'

export interface CompressOptions {
  algorithm?: 'gzip' | 'brotli' | 'both'
  threshold?: number
  deleteOriginalAssets?: boolean
}

export default function configCompressPlugin(options: CompressOptions = {}): Plugin | Plugin[] {
  const {
    algorithm = 'gzip',
    threshold = 10240,
    deleteOriginalAssets = false,
  } = options

  const plugins: Plugin[] = []

  if (algorithm === 'gzip' || algorithm === 'both') {
    plugins.push(
      compression({
        threshold,
        algorithm: 'gzip',
        deleteOriginalAssets,
      }) as Plugin,
    )
  }

  if (algorithm === 'brotli' || algorithm === 'both') {
    plugins.push(
      compression({
        threshold,
        algorithm: 'brotliCompress',
        deleteOriginalAssets,
      }) as Plugin,
    )
  }

  return plugins
}
