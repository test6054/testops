/**
 * Vue 单文件组件模块声明
 * 解决 .ts 文件中导入 .vue 时 TypeScript 无法识别模块的问题（TS2307）
 *
 * 说明：
 * - vite/client 在当前版本中不包含 *.vue 模块声明
 * - vue-tsc 通过 Volar 引擎原生支持 .vue 文件，不需要此声明
 * - WebStorm 的 TypeScript 服务需要此声明来解析 .vue 导入
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, never>
}
