import type { InjectionKey, Ref } from 'vue'

/** Layout 已注入档案袋教师范围选择器，页面无需重复渲染 PortfolioScopeHeader */
export const portfolioLayoutScopeProvidedKey: InjectionKey<Ref<boolean>> = Symbol('portfolioLayoutScopeProvided')
