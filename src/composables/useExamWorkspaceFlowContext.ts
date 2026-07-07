import type { Ref } from 'vue'
import type { ExamWorkbenchStageSnapshotResponse } from '@/apis/mark/exam-progress'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { EXAM_JOURNEY_STEPS, isExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import {
  EXAM_WORKSPACE_MENU_GROUPS,
  findExamWorkspaceMenuItem,
  resolveExamWorkspaceMenuGroupKey,
  resolveExamWorkspaceMenuKey
} from '@/constants/exam-workspace-menu'

/** 旅程内菜单管道步骤状态，对齐 ArchiveFlowContextBar 视觉语义 */
export type ExamWorkspaceFlowChainStatus = 'done' | 'current' | 'pending'

export interface ExamWorkspaceFlowStep {
  menuKey: string
  label: string
  routeName: string
  chainStatus: ExamWorkspaceFlowChainStatus
}

export interface UseExamWorkspaceFlowContextOptions {
  examId: Ref<string>
  snapshot: Ref<ExamWorkbenchStageSnapshotResponse | null>
}

/**
 * L0 跨考试链路 flowCtxBar 真源（扫描中心/阅卷会话等）；L1 考试工作台子页导航在侧栏，不使用本 composable。
 */
export function useExamWorkspaceFlowContext(options?: UseExamWorkspaceFlowContextOptions) {
  const route = useRoute()
  const router = useRouter()
  const injected = options ?? useMarkWorkbenchContext()
  const examId = injected.examId
  const journeyKey = computed<ExamWorkspaceJourneyKey>(() => {
    const key = route.meta.journeyKey
    if (key === undefined) {
      return 'overview'
    }
    if (isExamWorkspaceJourneyKey(key)) {
      return key
    }
    throw new Error(`考试工作台路由旅程契约异常：${String(route.name ?? route.path)}`)
  })

  const activeMenuKey = computed(() =>
    resolveExamWorkspaceMenuKey(route.name ? String(route.name) : undefined),
  )

  const flowSteps = computed((): ExamWorkspaceFlowStep[] => {
    const jk = journeyKey.value
    if (jk === 'overview') {
      return []
    }
    const routeName = route.name ? String(route.name) : ''
    const groupKey = resolveExamWorkspaceMenuGroupKey(routeName)
    if (!groupKey) {
      return []
    }
    const group = EXAM_WORKSPACE_MENU_GROUPS.find((entry) => entry.key === groupKey)
    const items = group?.items ?? []
    if (items.length <= 1) {
      return []
    }
    const activeIdx = items.findIndex((item) => item.key === activeMenuKey.value)
    return items.map((item, index) => ({
      menuKey: item.key,
      label: item.label,
      routeName: item.routeName,
      chainStatus:
        index === activeIdx ? 'current' : index < activeIdx ? 'done' : 'pending',
    }))
  })

  const journeyTitle = computed(() => {
    const key = journeyKey.value
    if (key === 'overview') {
      return ''
    }
    return EXAM_JOURNEY_STEPS.find((step) => step.key === key)?.title ?? ''
  })

  const flowTitle = computed(() => String(route.meta.title ?? ''))

  const flowSubtitle = computed(() => journeyTitle.value)

  const showFlowBar = computed(() => flowSteps.value.length > 1)

  function navigateToStep(menuKey: string): void {
    const item = findExamWorkspaceMenuItem(menuKey)
    if (!item || !examId.value) {
      return
    }
    void router.push({
      name: item.routeName,
      params: { examId: examId.value },
    })
  }

  return {
    flowSteps,
    flowTitle,
    flowSubtitle,
    activeMenuKey,
    showFlowBar,
    navigateToStep,
  }
}
