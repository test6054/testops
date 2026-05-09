import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import components from 'unplugin-vue-components/vite'

export default function createComponents() {
  return components({
    dirs: ['src/components'],
    extensions: ['vue', 'tsx'],
    dts: './src/types/components.d.ts',
    resolvers: [
      AntDesignVueResolver({
        importStyle: false,
      }),
    ],
  })
}
