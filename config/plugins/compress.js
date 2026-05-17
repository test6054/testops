import { compression } from 'vite-plugin-compression2';
export default function configCompressPlugin(options) {
    if (options === void 0) { options = {}; }
    var _a = options.algorithm, algorithm = _a === void 0 ? 'gzip' : _a, _b = options.threshold, threshold = _b === void 0 ? 10240 : _b, _c = options.deleteOriginalAssets, deleteOriginalAssets = _c === void 0 ? false : _c;
    var plugins = [];
    if (algorithm === 'gzip' || algorithm === 'both') {
        plugins.push(compression({
            threshold: threshold,
            algorithm: 'gzip',
            deleteOriginalAssets: deleteOriginalAssets,
        }));
    }
    if (algorithm === 'brotli' || algorithm === 'both') {
        plugins.push(compression({
            threshold: threshold,
            algorithm: 'brotliCompress',
            deleteOriginalAssets: deleteOriginalAssets,
        }));
    }
    return plugins;
}
