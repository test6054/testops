import type {Ref} from 'vue';
import type { PortfolioTeacherJourneySnapshotVO } from '@/apis/portfolio/journey'
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { portfolioTeacherJourneyApi } from '@/apis/portfolio/journey'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import {
  ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_KEY_CODES,
  PortfolioTeacherJourneyStepKeyCode,
} from '@/types/enums/portfolio-teacher-journey-step-key-enum'
import {
  ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_STATUS_CODES,
  PortfolioTeacherJourneyStepStatusCode,
  PortfolioTeacherJourneyStepStatusDescription,
} from '@/types/enums/portfolio-teacher-journey-step-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const JOURNEY_KEY_BY_API: Record<PortfolioTeacherJourneyStepKeyCode, PortfolioTeacherJourneyKey> = {
  [PortfolioTeacherJourneyStepKeyCode.OVERVIEW]: 'overview',
  [PortfolioTeacherJourneyStepKeyCode.LEARN]: 'learn',
  [PortfolioTeacherJourneyStepKeyCode.COLLECT]: 'collect',
  [PortfolioTeacherJourneyStepKeyCode.ARCHIVE]: 'archive',
  [PortfolioTeacherJourneyStepKeyCode.REVIEW]: 'review',
}

const WORKBENCH_STATUS_BY_STEP: Record<PortfolioTeacherJourneyStepStatusCode, WorkbenchStageStatus> = {
  [PortfolioTeacherJourneyStepStatusCode.AVAILABLE]: 'pending',
  [PortfolioTeacherJourneyStepStatusCode.ATTENTION]: 'warning',
  [PortfolioTeacherJourneyStepStatusCode.BLOCKED]: 'blocked',
}

function assertJourneyStepKey(value: string): PortfolioTeacherJourneyStepKeyCode {
  const matched = ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_KEY_CODES.find(code => code === value)
  if (!matched) {
    throw new Error(`未知档案袋旅程步骤键：${value}`)
  }
  return matched
}

function assertJourneyStepStatus(value: string): PortfolioTeacherJourneyStepStatusCode {
  const matched = ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_STATUS_CODES.find(code => code === value)
  if (!matched) {
    throw new Error(`未知档案袋旅程步骤状态：${value}`)
  }
  return matched
}

/** 将服务端旅程快照映射为 StageRail 阶段；当前页叠 active，不自造进度。 */
export function mapPortfolioTeacherJourneySnapshotToStages(
  snapshot: PortfolioTeacherJourneySnapshotVO,
  activeKey: PortfolioTeacherJourneyKey,
): WorkbenchStage[] {
  return snapshot.steps.map((step) => {
    const journeyKey = assertJourneyStepKey(step.journeyKey)
    const stepStatus = assertJourneyStepStatus(step.stepStatus)
    const routeKey = JOURNEY_KEY_BY_API[journeyKey]
    const statusText
      = step.statusSummary?.trim()
        || strictEnumLabel(PortfolioTeacherJourneyStepStatusDescription, stepStatus, '档案袋旅程步骤状态')
    return {
      key: routeKey,
      title: step.title,
      status: routeKey === activeKey ? 'active' : WORKBENCH_STATUS_BY_STEP[stepStatus],
      statusText,
    }
  })
}

/**
 * 加载教师档案袋旅程快照并映射旅程轨；失败可见且保留上次成功。
 */
export function usePortfolioTeacherJourneyRail(activeKey: Ref<PortfolioTeacherJourneyKey> | PortfolioTeacherJourneyKey) {
  const { targetTeacherId } = usePortfolioPageScope()
  const snapshot = ref<PortfolioTeacherJourneySnapshotVO | null>(null)
  const loading = ref(false)
  const loadFailed = ref(false)
  const lastSuccessAt = ref<string | null>(null)
  const loadGeneration = ref(0)

  const resolvedActiveKey = computed((): PortfolioTeacherJourneyKey =>
    typeof activeKey === 'string' ? activeKey : activeKey.value,
  )

  const journeyStages = computed((): WorkbenchStage[] => {
    if (!snapshot.value) {
      return []
    }
    return mapPortfolioTeacherJourneySnapshotToStages(snapshot.value, resolvedActiveKey.value)
  })

  async function loadJourneySnapshot() {
    const generation = ++loadGeneration.value
    loading.value = true
    loadFailed.value = false
    try {
      const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
      const result = await portfolioTeacherJourneyApi.getSnapshot(request)
      if (generation !== loadGeneration.value) {
        return
      }
      if (!Array.isArray(result.steps) || result.steps.length === 0) {
        throw new Error('教师档案袋旅程快照 steps 为空')
      }
      snapshot.value = result
      lastSuccessAt.value = result.generatedAt
    }
    catch (error) {
      if (generation !== loadGeneration.value) {
        return
      }
      loadFailed.value = true
      showUserError(error, '加载教师旅程快照失败')
    }
    finally {
      if (generation === loadGeneration.value) {
        loading.value = false
      }
    }
  }

  watch(
    targetTeacherId,
    () => {
      void loadJourneySnapshot()
    },
    { immediate: true },
  )

  return {
    journeyStages,
    loading,
    loadFailed,
    lastSuccessAt,
    loadJourneySnapshot,
  }
}
