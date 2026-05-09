import autoImport from 'unplugin-auto-import/vite'

export default function createAutoImport() {
  return autoImport({
    imports: ['vue', 'vue-router', {
      vue: ['useTemplateRef', 'onWatcherCleanup', 'useId'],
    }],
    dts: './src/types/auto-imports.d.ts',
  })
}
