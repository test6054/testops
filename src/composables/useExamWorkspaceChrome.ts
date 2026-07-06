import type { ComputedRef, Ref } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type { MarkingProgressVO, WorkbenchStageSnapshotVO } from '@/apis/mark/exam-progress'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_TONE, ExamStatusDescription, getExamDetail } from '@/apis/mark/exam'
import { MARK_STAGE_TITLE } from '@/constants/mark-workspace-nav'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import {
  resolveNextActionRouteName,
  resolvePrimaryEnabledNextAction,
} from '@/utils/exam-workspace-entry-gates'
import { buildExamWorkspaceSignalMetrics } from '@/utils/exam-workspace-signal-metrics'
import { navigateToJourneyStep, navigateToMarkStage } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

export interface UseExamWorkspaceChromeOptions {
  examId: ComputedRef<string>
  snapshot: Ref<WorkbenchStageSnapshotVO | null>
  journeyStages: ComputedRef<WorkbenchStage[]>
  activeJourneyKey: ComputedRef<ExamJourneyKey | 'overview'>
  suggestedStageKey: ComputedRef<MarkStageKey | null | undefined>
  refreshSnapshot: () => Promise<void>
}

/**
 * 考试工作台布局级 Chrome：聚合详情、进度与导航动作。
 */
export function useExamWorkspaceChrome(options: UseExamWorkspaceChromeOptions) {
  const router = useRouter()
  const examDetail = ref<ExamDetailVO | null>(null)
  const detailLoading = ref(false)

  const markingProgress = computed<MarkingProgressVO | null>(
    () => options.snapshot.value?.markingProgress ?? null,
  )

  const contextTitle = computed(
    () => options.snapshot.value?.examName ?? examDetail.value?.examName ?? '',
  )

  const contextSubtitle = computed(() => {
    const detail = examDetail.value
    const snapshot = options.snapshot.value
    const parts: string[] = []
    const examNo = detail?.examNo ?? snapshot?.examNo
    if (examNo) {
      parts.push(examNo)
    }
    if (detail?.courseName) {
      parts.push(detail.courseName)
    }
    if (detail?.departmentName) {
      parts.push(detail.departmentName)
    }
    if (detail?.createUserNickName) {
      parts.push(detail.createUserNickName)
    }
    if (detail?.academicYear || detail?.semester) {
      const term = [detail.academicYear, formatSemester(detail.semester)]
        .filter(Boolean)
        .join(' · ')
      if (term) {
        parts.push(term)
      }
    }
    return parts.join(' · ')
  })

  /** 侧栏考试信息副标题：课程与学年学期，不含编号（编号单独展示）。 */
  const sidebarContextLine = computed(() => {
    const detail = examDetail.value
    const parts: string[] = []
    if (detail?.courseName) {
      parts.push(detail.courseName)
    }
    if (detail?.departmentName && !detail?.courseName) {
      parts.push(detail.departmentName)
    }
    if (detail?.academicYear || detail?.semester) {
      const term = [detail.academicYear, formatSemester(detail.semester)]
        .filter(Boolean)
        .join(' ')
      if (term) {
        parts.push(term)
      }
    }
    return parts.join(' · ')
  })

  const examStatusLabel = computed(() => {
    const status = options.snapshot.value?.examStatus ?? examDetail.value?.status
    if (!status) {
      return ''
    }
    return strictEnumLabel(ExamStatusDescription, status, '考试状态')
  })

  const examStatusTone = computed(() => {
    const status = options.snapshot.value?.examStatus ?? examDetail.value?.status
    if (!status) {
      return undefined
    }
    return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
  })

  const primaryNextAction = computed(() =>
    resolvePrimaryEnabledNextAction(
      options.snapshot.value?.nextActions,
      options.suggestedStageKey.value,
    ),
  )

  const suggestedStageActionLabel = computed(() => {
    const key = options.suggestedStageKey.value
    if (!key) {
      return ''
    }
    return `前往${MARK_STAGE_TITLE[key]}`
  })

  const primaryActionLabel = computed(() => {
    const action = primaryNextAction.value
    if (action) {
      return action.label
    }
    const key = options.suggestedStageKey.value
    if (!key) {
      return ''
    }
    return `前往${MARK_STAGE_TITLE[key]}`
  })

  const showPrimaryAction = computed(() => {
    if (options.activeJourneyKey.value === 'prep') {
      return false
    }
    return (
      Boolean(primaryNextAction.value)
      || Boolean(options.suggestedStageKey.value && options.examId.value)
    )
  })

  function goSuggestedStageByKey(): void {
    const key = options.suggestedStageKey.value
    if (!key || !options.examId.value) {
      return
    }
    navigateToMarkStage(router, key, options.examId.value, {
      scanAttentionCount: markingProgress.value?.scanAttentionCount,
    })
  }

  function goSuggestedStage(): void {
    const action = primaryNextAction.value
    if (action && options.examId.value) {
      const routeName = resolveNextActionRouteName(
        action.actionKey,
        options.examId.value,
        markingProgress.value?.scanAttentionCount,
      )
      void router.push({
        name: routeName,
        params: { examId: options.examId.value },
      })
      return
    }
    const key = options.suggestedStageKey.value
    if (!key || !options.examId.value) {
      return
    }
    navigateToMarkStage(router, key, options.examId.value, {
      scanAttentionCount: markingProgress.value?.scanAttentionCount,
    })
  }

  function onJourneySelect(journeyKey: ExamJourneyKey): void {
    if (!options.examId.value) {
      return
    }
    navigateToJourneyStep(router, journeyKey, options.examId.value, {
      scanAttentionCount: markingProgress.value?.scanAttentionCount,
    })
  }

  function navigateMetric(key: string): void {
    if (!options.examId.value) {
      return
    }
    const examId = options.examId.value
    const scanOpts = { scanAttentionCount: markingProgress.value?.scanAttentionCount }
    switch (key) {
      case 'scan-attention':
        navigateToMarkStage(router, 'SCAN', examId, scanOpts)
        break
      case 'gradable':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.SCAN, examId, scanOpts)
        break
      case 'grade-rate':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.MARK, examId, scanOpts)
        break
      case 'review-tasks':
        void router.push({ name: 'TeacherExamWorkspaceMarkingReview', params: { examId } })
        break
      case 'open-processing':
        void router.push({ name: 'TeacherExamWorkspaceMarkingArbitration', params: { examId } })
        break
      case 'prep-done':
      case 'prep-block':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.PREP, examId, scanOpts)
        break
      case 'org-pending':
      case 'org-ready':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.ASSIGN, examId, scanOpts)
        break
      default:
        break
    }
  }

  const examSignalMetrics = computed<SignalMetric[]>(() =>
    buildExamWorkspaceSignalMetrics(markingProgress.value, {
      onScanAttention: () => navigateMetric('scan-attention'),
      onGradable: () => navigateMetric('gradable'),
      onGradeRate: () => navigateMetric('grade-rate'),
      onPendingReview: () => navigateMetric('review-tasks'),
      onOpenProcessing: () => navigateMetric('open-processing'),
    }),
  )

  async function loadExamDetail(): Promise<void> {
    if (!options.examId.value) {
      examDetail.value = null
      return
    }
    detailLoading.value = true
    try {
      examDetail.value = await getExamDetail(options.examId.value)
    } catch (error) {
      examDetail.value = null
      showUserError(error, '考试详情加载失败')
    } finally {
      detailLoading.value = false
    }
  }

  async function refreshChrome(): Promise<void> {
    await Promise.all([options.refreshSnapshot(), loadExamDetail()])
  }

  watch(
    options.examId,
    () => {
      void loadExamDetail()
    },
    { immediate: true },
  )

  return {
    examDetail,
    detailLoading,
    markingProgress,
    contextTitle,
    contextSubtitle,
    sidebarContextLine,
    examStatusLabel,
    examStatusTone,
    primaryActionLabel,
    suggestedStageActionLabel,
    showPrimaryAction,
    examSignalMetrics,
    goSuggestedStage,
    goSuggestedStageByKey,
    onJourneySelect,
    navigateMetric,
    refreshChrome,
  }
}
