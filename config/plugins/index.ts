import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'

import appInfo from './app-info'
import createAutoImport from './auto-import'
import createComponents from './components'
import configCompressPlugin from './compress'

export default async function createVitePlugins(isBuild = false) {
  const vitePlugins: (PluginOption | PluginOption[])[] = [appInfo(), tailwindcss(), vue(), vueJsx()]

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
