/**
 * 一体机工作站父子组件依赖注入契约
 */

import type { InjectionKey, Ref } from 'vue'
import type { ExamKioskWorkflow } from './useExamKioskWorkflow'
import type { KioskMutex } from './useKioskMutex'
import type { KioskStageMachine } from './useStageMachine'
import type { ExamScannerBatchResponse } from '@/apis/mark/scanner-kiosk'
import { inject } from 'vue'

/**
 * UI 视图层共享状态（不属于业务 workflow，仅控制持久 UI 元素的显隐）。
 */
export interface KioskUiState {
  settingsDrawerOpen: Ref<boolean>
  openSettings: () => void
  closeSettings: () => void
  viewHistoryLedger: (item: ExamScannerBatchResponse) => void
  closeHistoryLedger: () => void
}

export interface KioskCtx {
  workflow: ExamKioskWorkflow
  mutex: KioskMutex
  stage: KioskStageMachine
  ui: KioskUiState
}

export const KIOSK_CTX_KEY: InjectionKey<KioskCtx> = Symbol('KIOSK_CTX')

export function useKioskCtx(): KioskCtx {
  const ctx = inject(KIOSK_CTX_KEY)
  if (!ctx) {
    throw new Error(
      '[scanner-kiosk] useKioskCtx 必须在 KioskLayout 内部子树中调用：'
      + '请确认子组件挂载在 /scanner-kiosk 父路由下。',
    )
  }
  return ctx
}
