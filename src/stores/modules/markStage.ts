/**
 * 阅卷主链阶段状态 Store
 *
 * 业务边界：跨阅卷主链页面共享当前考试在 9 个领域阶段的推进状态。每场考试独立持有
 * 一份 progress（Map<examId, MarkStageProgress>），切换 examId 时自动隔离。
 *
 * 阶段定义（严格遵循“可顺序推进”原则，并行能力不占位）：
 *   EXAM_PREP（考试准备）
 *   → PAPER_TEMPLATE（制卷与模板）
 *   → SCAN（扫描与识别）
 *   → MARKING_ORG（阅卷组织）
 *   → TRIAL_MARK（试评校准）
 *   → FORMAL_MARK（正评）
 *   → SCORE_PUBLISH（成绩发布）
 *   → GRADE_REVIEW（复核处理）
 *   → ARCHIVE（归档）
 *
 * 重构说明（代替原 10 阶段设计）：
 * - 合并 RECOGNITION 到 SCAN：识别是扫描子流程，无独立 UI 页面。
 * - 删除 QUALITY_CONTROL：抽检与仔裁是 FORMAL_MARK 的并行能力，
 *   通过 marking-spot-check / review-arbitration 页面独立表达，
 *   不占据顺序阶段位置，避免误导“抽检完成才能发布”。
 *
 * 状态来源：业务页面（如 exam-prep-workbench / scan-upload / marking-overview / score-publish 等）
 * 在 onMounted / 数据刷新时调用 setStageStatus 或 bulkUpdate 写入；本 Store 不主动拉数据。
 *
 * 不持久化：阶段状态来自服务端真实数据，启动后由各页面同步，避免缓存陈旧状态导致误判。
 */
import type { WorkbenchStageStatus } from '@/types/workbench'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type MarkStageKey
  = | 'EXAM_PREP'
    | 'PAPER_TEMPLATE'
    | 'SCAN'
    | 'MARKING_ORG'
    | 'TRIAL_MARK'
    | 'FORMAL_MARK'
    | 'SCORE_PUBLISH'
    | 'GRADE_REVIEW'
    | 'ARCHIVE'

export interface MarkStageProgress {
  current: MarkStageKey
  states: Record<MarkStageKey, WorkbenchStageStatus>
  hints: Record<MarkStageKey, string>
  blockedReason: string
}

const ORDERED_STAGES: ReadonlyArray<MarkStageKey> = [
  'EXAM_PREP',
  'PAPER_TEMPLATE',
  'SCAN',
  'MARKING_ORG',
  'TRIAL_MARK',
  'FORMAL_MARK',
  'SCORE_PUBLISH',
  'GRADE_REVIEW',
  'ARCHIVE',
]

const STAGE_TITLES: Record<MarkStageKey, string> = {
  EXAM_PREP: '考试准备',
  PAPER_TEMPLATE: '制卷与模板',
  SCAN: '扫描与识别',
  MARKING_ORG: '阅卷组织',
  TRIAL_MARK: '试评校准',
  FORMAL_MARK: '正评',
  SCORE_PUBLISH: '成绩发布',
  GRADE_REVIEW: '复核处理',
  ARCHIVE: '归档',
}

function emptyStates(): Record<MarkStageKey, WorkbenchStageStatus> {
  return {
    EXAM_PREP: 'pending',
    PAPER_TEMPLATE: 'pending',
    SCAN: 'pending',
    MARKING_ORG: 'pending',
    TRIAL_MARK: 'pending',
    FORMAL_MARK: 'pending',
    SCORE_PUBLISH: 'pending',
    GRADE_REVIEW: 'pending',
    ARCHIVE: 'pending',
  }
}

function emptyHints(): Record<MarkStageKey, string> {
  return {
    EXAM_PREP: '',
    PAPER_TEMPLATE: '',
    SCAN: '',
    MARKING_ORG: '',
    TRIAL_MARK: '',
    FORMAL_MARK: '',
    SCORE_PUBLISH: '',
    GRADE_REVIEW: '',
    ARCHIVE: '',
  }
}

function emptyProgress(): MarkStageProgress {
  return {
    current: 'EXAM_PREP',
    states: emptyStates(),
    hints: emptyHints(),
    blockedReason: '',
  }
}

export const useMarkStageStore = defineStore('markStage', () => {
  /** examId → 该考试的阶段进度 */
  const progressMap = ref<Map<string, MarkStageProgress>>(new Map())

  /** 当前观察的考试 examId（业务调用方设置；与 markExamContext.currentExamId 解耦保持灵活） */
  const observedExamId = ref<string>('')

  /* ---------- Helpers ---------- */

  function ensureProgress(examId: string): MarkStageProgress {
    let progress = progressMap.value.get(examId)
    if (!progress) {
      progress = emptyProgress()
      const next = new Map(progressMap.value)
      next.set(examId, progress)
      progressMap.value = next
    }
    return progress
  }

  /* ---------- Computed ---------- */

  const observedProgress = computed<MarkStageProgress>(() => {
    if (!observedExamId.value) return emptyProgress()
    return progressMap.value.get(observedExamId.value) ?? emptyProgress()
  })

  const orderedStages = computed(() => ORDERED_STAGES.map((key) => ({
    key,
    title: STAGE_TITLES[key],
    status: observedProgress.value.states[key],
    statusText: observedProgress.value.hints[key] || undefined,
  })))

  const hasBlocked = computed(() =>
    Object.values(observedProgress.value.states).includes('blocked'),
  )

  /* ---------- Actions ---------- */

  function observeExam(examId: string): void {
    observedExamId.value = examId
    if (examId) ensureProgress(examId)
  }

  function setCurrentStage(examId: string, key: MarkStageKey): void {
    const progress = ensureProgress(examId)
    progress.current = key
    progressMap.value = new Map(progressMap.value)
  }

  function setStageStatus(
    examId: string,
    key: MarkStageKey,
    status: WorkbenchStageStatus,
    hint?: string,
  ): void {
    const progress = ensureProgress(examId)
    progress.states[key] = status
    if (hint !== undefined) progress.hints[key] = hint
    if (status === 'blocked' && hint) progress.blockedReason = hint
    progressMap.value = new Map(progressMap.value)
  }

  function bulkUpdate(
    examId: string,
    updates: Partial<Record<MarkStageKey, { status: WorkbenchStageStatus, hint?: string }>>,
  ): void {
    const progress = ensureProgress(examId)
    for (const key of Object.keys(updates) as MarkStageKey[]) {
      const update = updates[key]
      if (!update) continue
      progress.states[key] = update.status
      if (update.hint !== undefined) progress.hints[key] = update.hint
    }
    // 同步整体阻断原因（取第一个 blocked 阶段的 hint）
    const firstBlocked = ORDERED_STAGES.find((k) => progress.states[k] === 'blocked')
    progress.blockedReason = firstBlocked ? progress.hints[firstBlocked] : ''
    progressMap.value = new Map(progressMap.value)
  }
  function reset(): void {
    progressMap.value = new Map()
    observedExamId.value = ''
  }

  return {
    progressMap,
    observedExamId,
    observedProgress,
    orderedStages,
    hasBlocked,
    observeExam,
    setCurrentStage,
    setStageStatus,
    bulkUpdate,
    reset,
  }
})
