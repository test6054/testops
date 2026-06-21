import type { InjectionKey, Ref } from 'vue'
import type { AccreditationCockpitVO } from '@/apis/quality/accreditation'

/** Layout 已注入质量范围选择器，页面无需重复渲染 QualityScopeHeader */
export const qualityLayoutScopeProvidedKey: InjectionKey<Ref<boolean>> = Symbol('qualityLayoutScopeProvided')

/** 数据接入 hub 内嵌模式，页面无需 StageWorkbenchShell 外壳 */
export const qualityIngestEmbeddedKey: InjectionKey<Ref<boolean>> = Symbol('qualityIngestEmbedded')

export interface AccreditationPhaseContext {
  cockpit: Ref<AccreditationCockpitVO | undefined>
  loading: Ref<boolean>
  reload: () => Promise<void>
}

export const accreditationPhaseContextKey: InjectionKey<AccreditationPhaseContext> = Symbol('accreditationPhaseContext')
