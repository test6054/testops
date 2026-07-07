import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { EXAM_JOURNEY_STEPS, isExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import {
  findExamWorkspaceMenuItem,
  getMenuGroupsForJourney,
  resolveExamWorkspaceMenuKey,
} from '@/constants/exam-workspace-menu'

/** 旅程内菜单管道步骤状态，对齐 ArchiveFlowContextBar 视觉语义 */
export type ExamWorkspaceFlowChainStatus = 'done' | 'current' | 'pending'

export interface ExamWorkspaceFlowStep {
  menuKey: string
  label: string
  routeName: string
  chainStatus: ExamWorkspaceFlowChainStatus
}

/**
 * 考试工作台子页 flowCtxBar 真源：当前 journey 侧栏菜单项管道 + 上/下一步导航。
 */
export function useExamWorkspaceFlowContext() {
  const route = useRoute()
  const router = useRouter()
  const { examId, snapshot } = useMarkWorkbenchContext()

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
    const items = getMenuGroupsForJourney(jk).flatMap((group) => group.items)
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

  const flowTitle = computed(() => {
    const pageTitle = String(route.meta.title ?? '')
    const examName = snapshot.value?.examName ?? ''
    if (examName && pageTitle) {
      return `${examName} · ${pageTitle}`
    }
    return pageTitle || examName
  })

  const flowSubtitle = computed(() => {
    const jt = journeyTitle.value
    const examNo = snapshot.value?.examNo ?? ''
    if (jt && examNo) {
      return `${jt} · ${examNo}`
    }
    return jt || examNo
  })

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
