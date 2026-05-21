/**
 * 修复 ant-design-vue 4.2.6 + TypeScript 5.8.x + Vue 3.5.x 类型兼容问题。
 *
 * ant-design-vue 的 .d.ts 内部使用 CreateComponentPublicInstanceWithMixins，
 * 其泛型约束要求 GlobalComponents 满足 Record<string, Component<...>>，
 * 但 Vue 3.5 的 GlobalComponents 接口是纯具名属性、缺少 string 索引签名，
 * 导致 TS2344。
 *
 * 此补丁为 GlobalComponents 添加兜底索引签名以满足约束。
 * 具名属性（AButton、AInput 等）仍由 components.d.ts 提供精确类型，
 * 索引签名仅作为类型约束的兜底，不影响开发体验。
 *
 * 追踪：https://github.com/vuejs/language-tools/issues/5161
 * 当 ant-design-vue 发布兼容版本后可移除此文件。
 */
import type { Component } from 'vue'

declare module 'vue' {
  interface GlobalComponents {
    [key: string]: Component
  }
}
