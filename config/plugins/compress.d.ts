import type { Plugin } from 'vite';
export interface CompressOptions {
    algorithm?: 'gzip' | 'brotli' | 'both';
    threshold?: number;
    deleteOriginalAssets?: boolean;
}
export default function configCompressPlugin(options?: CompressOptions): Plugin | Plugin[];
