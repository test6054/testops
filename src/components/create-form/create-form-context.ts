import type { InjectionKey, Ref } from 'vue'

/** 创建页内部滚动容器，供锚点 scroll spy 绑定 */
export const createFormScrollContainerKey: InjectionKey<Ref<HTMLElement | null>>
  = Symbol('createFormScrollContainer')
