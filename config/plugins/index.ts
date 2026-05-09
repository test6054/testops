import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'

import appInfo from './app-info'
import createAutoImport from './auto-import'
import createComponents from './components'
import configCompressPlugin from './compress'

export default async function createVitePlugins(viteEnv: Record<string, string>, isBuild = false) {
  const _ = viteEnv
  const vitePlugins: (PluginOption | PluginOption[])[] = [
    appInfo(),
    vue(),
    vueJsx(),
  ]

  if (!isBuild) {
    vitePlugins.push(VueDevTools())
  }

  vitePlugins.push(createAutoImport())
  vitePlugins.push(createComponents())

  if (isBuild) {
    vitePlugins.push(
      configCompressPlugin({
        algorithm: 'gzip',
        threshold: 10240,
        deleteOriginalAssets: false,
      }),
    )
  }

  return vitePlugins
}
