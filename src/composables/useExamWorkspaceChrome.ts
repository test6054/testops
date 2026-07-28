import type { ComputedRef, Ref } from 'vue'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamWorkbenchStageSnapshotResponse, MarkingProgressResponse } from '@/apis/mark/exam-progress'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_TONE, ExamStatusDescription, getExamDetail } from '@/apis/mark/exam'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import {
  findWorkbenchNextAction,
  resolveWorkbenchNextActionRouteName,
} from '@/utils/exam-workspace-entry-gates'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import { buildExamWorkspaceSignalMetrics } from '@/utils/exam-workspace-signal-metrics'
import { navigateToJourneyStep } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

export interface UseExamWorkspaceChromeOptions {
  examId: ComputedRef<string>
  snapshot: Ref<ExamWorkbenchStageSnapshotResponse | null>
  journeyStages: ComputedRef<WorkbenchStage[]>
  activeJourneyKey: ComputedRef<ExamJourneyKey | 'overview'>
  refreshSnapshot: () => Promise<void>
}

/**
 * 考试工作台布局级 Chrome：聚合详情、进度与入口合同导航（禁止 suggestedStage 平行跳转）。
 */
export function useExamWorkspaceChrome(options: UseExamWorkspaceChromeOptions) {
  const router = useRouter()
  const examDetail = ref<ExamDetailResponse | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  const markingProgress = computed<MarkingProgressResponse | null>(
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

  const entryWorkspaceRouteName = computed(() => options.snapshot.value?.workspaceRouteName?.trim() || '')
  const entryActionLabel = computed(() => options.snapshot.value?.enterActionLabel?.trim() || '')

  const primaryActionLabel = computed(() => entryActionLabel.value)

  const showPrimaryAction = computed(() => {
    if (options.activeJourneyKey.value === MarkTeacherDashboardJourneyKeyCode.PREP) {
      return false
    }
    return Boolean(entryWorkspaceRouteName.value && entryActionLabel.value && options.examId.value)
  })

  function goPrimaryEntryAction(): void {
    if (!options.examId.value) {
      return
    }
    const routeName = entryWorkspaceRouteName.value
    if (!routeName) {
      throw new Error('考试工作台缺少 workspaceRouteName 合同字段')
    }
    navigateExamWorkspaceRoute(
      router,
      routeName,
      { examId: options.examId.value },
      '工作台主入口',
    )
  }

  function onJourneySelect(journeyKey: ExamJourneyKey): void {
    if (!options.examId.value) {
      return
    }
    if (journeyKey === MarkTeacherDashboardJourneyKeyCode.SCAN) {
      const startScan = findWorkbenchNextAction(
        options.snapshot.value?.nextActions,
        WorkbenchNextActionKeyCode.START_SCAN,
      )
      if (!startScan) {
        throw new Error('扫描旅程缺少 START_SCAN nextAction 合同')
      }
      navigateExamWorkspaceRoute(
        router,
        resolveWorkbenchNextActionRouteName(startScan),
        { examId: options.examId.value },
        '扫描旅程入口',
      )
      return
    }
    if (journeyKey === MarkTeacherDashboardJourneyKeyCode.PUBLISH) {
      const nextActions = options.snapshot.value?.nextActions
      const approve = findWorkbenchNextAction(
        nextActions,
        WorkbenchNextActionKeyCode.APPROVE_PUBLISH_REVIEW,
      )
      if (approve?.enabled === true) {
        if (approve.openPendingMyPublishReview !== true) {
          throw new Error('签审旅程 APPROVE_PUBLISH_REVIEW 缺少 openPendingMyPublishReview=true')
        }
        navigateExamWorkspaceRoute(
          router,
          resolveWorkbenchNextActionRouteName(approve),
          { examId: options.examId.value },
          '发布旅程签审入口',
          { pendingMyReview: '1' },
        )
        return
      }
      const submit = findWorkbenchNextAction(
        nextActions,
        WorkbenchNextActionKeyCode.SUBMIT_PUBLISH_REVIEW,
      )
      if (!submit) {
        throw new Error('发布旅程缺少 SUBMIT_PUBLISH_REVIEW nextAction 合同')
      }
      navigateExamWorkspaceRoute(
        router,
        resolveWorkbenchNextActionRouteName(submit),
        { examId: options.examId.value },
        '发布旅程提交复核入口',
      )
      return
    }
    navigateToJourneyStep(router, journeyKey, options.examId.value)
  }

  function navigateMetric(key: string): void {
    if (!options.examId.value) {
      return
    }
    const examId = options.examId.value
    const snapshot = options.snapshot.value
    switch (key) {
      case 'scan-attention': {
        const startScan = findWorkbenchNextAction(snapshot?.nextActions, WorkbenchNextActionKeyCode.START_SCAN)
        if (!startScan) {
          throw new Error('扫描异常指标缺少 START_SCAN nextAction 合同')
        }
        navigateExamWorkspaceRoute(
          router,
          resolveWorkbenchNextActionRouteName(startScan),
          { examId },
          '扫描异常指标入口',
        )
        break
      }
      case 'gradable':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.SCAN, examId)
        break
      case 'grade-rate':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.MARK, examId)
        break
      case 'review-tasks': {
        const enterReview = findWorkbenchNextAction(snapshot?.nextActions, WorkbenchNextActionKeyCode.ENTER_REVIEW)
        if (!enterReview) {
          throw new Error('复核指标缺少 ENTER_REVIEW nextAction 合同')
        }
        navigateExamWorkspaceRoute(
          router,
          resolveWorkbenchNextActionRouteName(enterReview),
          { examId },
          '复核指标入口',
        )
        break
      }
      case 'open-processing': {
        const startScan = findWorkbenchNextAction(snapshot?.nextActions, WorkbenchNextActionKeyCode.START_SCAN)
        if (!startScan) {
          throw new Error('处理任务指标缺少 START_SCAN nextAction 合同')
        }
        navigateExamWorkspaceRoute(
          router,
          resolveWorkbenchNextActionRouteName(startScan),
          { examId },
          '处理任务指标入口',
        )
        break
      }
      case 'prep-done':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.PREP, examId)
        break
      case 'org-pending':
      case 'org-ready':
        navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.ASSIGN, examId)
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
      detailError.value = null
      return
    }
    detailLoading.value = true
    detailError.value = null
    try {
      examDetail.value = await getExamDetail(options.examId.value)
    } catch (error) {
      examDetail.value = null
      detailError.value = '考试详情加载失败'
      showUserError(error, detailError.value)
    } finally {
      detailLoading.value = false
    }
  }

  async function refreshChrome(): Promise<void> {
    await Promise.allSettled([options.refreshSnapshot(), loadExamDetail()])
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
    detailError,
    markingProgress,
    contextTitle,
    contextSubtitle,
    sidebarContextLine,
    examStatusLabel,
    examStatusTone,
    primaryActionLabel,
    showPrimaryAction,
    examSignalMetrics,
    goPrimaryEntryAction,
    onJourneySelect,
    navigateMetric,
    refreshChrome,
  }
}
