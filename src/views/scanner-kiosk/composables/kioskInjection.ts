/**
 * 一体机工作站父子组件依赖注入契约
 *
 * KioskLayout 在 setup 中实例化 useKioskWorkflow / useKioskMutex / useStageMachine 后
 * 通过 provide(KIOSK_CTX_KEY, ctx) 下行；4 个 stage 子路由通过 useKioskCtx() 读回，
 * 不再各自调用 composable。这避免了多实例化导致的状态不一致与 timer / SSE 重复订阅。
 */

import type { InjectionKey, Ref } from 'vue'
import type { KioskMutex } from './useKioskMutex'
import type { KioskWorkflow } from './useKioskWorkflow'
import type { KioskStageMachine } from './useStageMachine'
import type { ExamScannerKioskBatchHistoryItem } from '@/apis/mark/scanner-kiosk'
import { inject } from 'vue'

/**
 * UI 视图层共享状态（不属于业务 workflow，仅控制持久 UI 元素的显隐）。
 *
 * 抽屉互斥契约：
 *   - 同一时刻最多一个抽屉打开（设备设置 / 历史批次 ledger）；
 *   - 通过 `openSettings` / `viewHistoryLedger` 统一入口，自动关闭对方避免叠加；
 *   - 关闭操作（closeSettings / closeHistoryLedger）只清自己。
 *
 * `shortcutHintsOpen` 是只读 modal overlay，与抽屉互斥分开：抽屉打开时仍可叠加 hints。
 * 快捷提示只承载现场操作辅助，不改变任何扫描任务、设备绑定或批次状态。
 */
export interface KioskUiState {
  settingsDrawerOpen: Ref<boolean>
  shortcutHintsOpen: Ref<boolean>
  openSettings: () => void
  closeSettings: () => void
  /** 触发查看历史批次 ledger（先关闭其它抽屉再调用 workflow.viewBatchHistoryLedger） */
  viewHistoryLedger: (item: ExamScannerKioskBatchHistoryItem) => void
  /** 关闭历史批次 ledger 抽屉（清空 workflow.historyLedgerBatch） */
  closeHistoryLedger: () => void
  openShortcutHints: () => void
  closeShortcutHints: () => void
}

export interface KioskCtx {
  workflow: KioskWorkflow
  mutex: KioskMutex
  stage: KioskStageMachine
  ui: KioskUiState
}

export const KIOSK_CTX_KEY: InjectionKey<KioskCtx> = Symbol('KIOSK_CTX')

/**
 * 子组件 / stage 通过 useKioskCtx() 读取上下文。
 * 缺失时显式抛错，避免后续解构出现 undefined 静默失败。
 */
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
