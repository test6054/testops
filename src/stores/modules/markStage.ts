/**
 * 阅卷主链阶段状态 Store：仅缓存后端 workbench-stage-snapshot，不做客户端推导。
 */
import type { WorkbenchStageSnapshotVO } from '@/apis/mark/exam-progress'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import {
  formatExamConfidentialLabel,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type MarkStageKey
  = | 'EXAM_PREP'
    | 'PAPER_TEMPLATE'
    | 'CANDIDATE_ROSTER'
    | 'SCAN'
    | 'MARKING_ORG'
    | 'TRIAL_MARKING'
    | 'FORMAL_MARKING'
    | 'SCORE_PUBLISH'
    | 'ARCHIVE'

export interface SelectedExamMeta {
  examId: string
  examName: string
  examNo: string
}

export const MARK_STAGE_ORDER: ReadonlyArray<MarkStageKey> = [
  'EXAM_PREP',
  'PAPER_TEMPLATE',
  'CANDIDATE_ROSTER',
  'SCAN',
  'MARKING_ORG',
  'TRIAL_MARKING',
  'FORMAL_MARKING',
  'SCORE_PUBLISH',
  'ARCHIVE',
]

function mapSnapshotStatus(status: string): WorkbenchStageStatus {
  if (status === 'pending'
    || status === 'active'
    || status === 'completed'
    || status === 'warning'
    || status === 'error'
    || status === 'blocked') {
    return status
  }
  throw new Error(`未知阶段状态：${status}`)
}

export const useMarkStageStore = defineStore('markStage', () => {
  const observedExamId = ref('')
  const snapshot = ref<WorkbenchStageSnapshotVO | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const refreshedAt = ref<number | null>(null)

  const selectedExamMeta = computed<SelectedExamMeta | null>(() => {
    const current = snapshot.value
    if (!current) {
      return null
    }
    return {
      examId: current.examId,
      examName: current.examName,
      examNo: current.examNo,
    }
  })

  const orderedStages = computed<WorkbenchStage[]>(() => {
    const current = snapshot.value
    if (!current) {
      return []
    }
    return current.stages.map((stage) => ({
      key: stage.key,
      title: stage.title,
      status: mapSnapshotStatus(stage.status),
      statusText: stage.hint || undefined,
    }))
  })

  const suggestedStageKey = computed<MarkStageKey | null>(() => {
    const key = snapshot.value?.suggestedStageKey
    if (!key) {
      return null
    }
    if (!MARK_STAGE_ORDER.includes(key as MarkStageKey)) {
      throw new Error(`未知建议阶段：${key}`)
    }
    return key as MarkStageKey
  })

  const prepAdvisoryReasons = computed(() => snapshot.value?.prepAdvisoryReasons ?? [])
  const prepBlockingReasons = computed(() => snapshot.value?.prepBlockingReasons ?? [])
  const isExamConfidential = computed(() => isExamConfidentialFlag(snapshot.value?.confidential))
  const examConfidentialLabel = computed(() => formatExamConfidentialLabel(snapshot.value))

  const selectedExamLabel = computed(() => {
    const meta = selectedExamMeta.value
    if (!meta) {
      return ''
    }
    return meta.examNo ? `${meta.examName}（${meta.examNo}）` : meta.examName
  })

  function observeExam(examId: string): void {
    observedExamId.value = examId
  }

  function applySnapshot(next: WorkbenchStageSnapshotVO): void {
    observedExamId.value = next.examId
    snapshot.value = next
    error.value = null
    refreshedAt.value = Date.now()
  }

  function setLoading(value: boolean): void {
    loading.value = value
  }

  function setError(message: string | null): void {
    error.value = message
  }

  function reset(): void {
    observedExamId.value = ''
    snapshot.value = null
    loading.value = false
    error.value = null
    refreshedAt.value = null
  }

  return {
    observedExamId,
    snapshot,
    loading,
    error,
    refreshedAt,
    selectedExamMeta,
    orderedStages,
    suggestedStageKey,
    prepAdvisoryReasons,
    prepBlockingReasons,
    isExamConfidential,
    examConfidentialLabel,
    selectedExamLabel,
    observeExam,
    applySnapshot,
    setLoading,
    setError,
    reset,
  }
})
