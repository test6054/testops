import type { AuditIssueVO } from '@/apis/quality/audit-issue'
import type { AuditRectificationVO } from '@/apis/quality/audit-rectification'
import type { AuditSupervisionVO } from '@/apis/quality/audit-supervision'
import type { ImprovementTaskVO } from '@/apis/quality/improvement-task'
import { ref } from 'vue'
import { auditIssueApi } from '@/apis/quality/audit-issue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import { auditSupervisionApi } from '@/apis/quality/audit-supervision'
import { improvementTaskApi } from '@/apis/quality/improvement-task'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { toUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'

/** SignalBand 全量拉取分页大小，与后端 PageResult 协议一致 */
const SIGNAL_PAGE_SIZE = 100

/**
 * 改进工作台 SignalBand 数据源：按当前质量范围 readAllPages 拉取四表全量 VO，
 * 避免用 Tab 当前分页 list 冒充租户级健康度统计。
 */
export function useImprovementWorkbenchSignalSources() {
  const qualityStore = useQualityStore()
  const signalImprovementList = ref<ImprovementTaskVO[]>([])
  const signalIssueList = ref<AuditIssueVO[]>([])
  const signalRectList = ref<AuditRectificationVO[]>([])
  const signalSupList = ref<AuditSupervisionVO[]>([])

  /** @returns 是否已将当前 scope 下的 VO 写入 SignalBand */
  async function loadSignalSources(): Promise<boolean> {
    const scope = beginQualityScopeRequest()
    const trainingPlanId = qualityStore.currentTrainingPlanId
    const programId = qualityStore.currentProgramId || undefined

    try {
      const [improvements, issues, rects, sups] = await Promise.all([
        trainingPlanId
          ? readAllPages(
              pageNum => improvementTaskApi.page({
                pageNum,
                pageSize: SIGNAL_PAGE_SIZE,
                trainingPlanId,
                programId,
              }),
              '持续改进任务加载失败，请稍后重试',
            )
          : Promise.resolve([] as ImprovementTaskVO[]),
        readAllPages(
          pageNum => auditIssueApi.page({
            pageNum,
            pageSize: SIGNAL_PAGE_SIZE,
            programId,
            trainingPlanId: trainingPlanId || undefined,
          }),
          '审核评估问题加载失败，请稍后重试',
        ),
        readAllPages(
          pageNum => auditRectificationApi.page({
            pageNum,
            pageSize: SIGNAL_PAGE_SIZE,
          }),
          '整改任务加载失败，请稍后重试',
        ),
        readAllPages(
          pageNum => auditSupervisionApi.page({
            pageNum,
            pageSize: SIGNAL_PAGE_SIZE,
            programId,
          }),
          '督导复查记录加载失败，请稍后重试',
        ),
      ])
      if (scope.isStale()) {
        return false
      }
      signalImprovementList.value = improvements
      signalIssueList.value = issues
      signalRectList.value = rects
      signalSupList.value = sups
      return true
    } catch (error) {
      if (scope.isStale()) {
        return false
      }
      throw toUserError(error, '工作台指标加载失败')
    }
  }

  return {
    signalImprovementList,
    signalIssueList,
    signalRectList,
    signalSupList,
    loadSignalSources,
  }
}
