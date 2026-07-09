import type { DefaultOptionType } from 'ant-design-vue/es/select'
import type { ExamCandidateResponse } from '@/apis/mark/exam-scope'
import type { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import { ref } from 'vue'
import { CandidateStatusDescription, pageExamCandidates } from '@/apis/mark/exam-scope'
import {
  AttemptStatusDescription,
  BINDABLE_ATTEMPT_STATUS_CODES,
} from '@/types/enums/attempt-status-enum'
import { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import { showUserError } from '@/utils/error-handler'

const CANDIDATE_BIND_SEARCH_PAGE_SIZE = 20

export const BINDABLE_ATTEMPT_STATUS_OPTIONS: Array<{ label: string, value: AttemptStatusCode }>
  = BINDABLE_ATTEMPT_STATUS_CODES.map((value) => ({
    value,
    label: AttemptStatusDescription[value],
  }))

function isCandidateBindable(candidate: ExamCandidateResponse): boolean {
  return candidate.status === CandidateStatusCode.ACTIVE
}

function candidateStatusLabel(status: CandidateStatusCode | undefined): string {
  if (!status || !CandidateStatusDescription[status]) {
    return '状态异常'
  }
  return CandidateStatusDescription[status]
}

function mapCandidateOption(
  item: ExamCandidateResponse,
  cache: Map<string, ExamCandidateResponse>,
): DefaultOptionType {
  cache.set(item.candidateRosterId, item)
  return {
    value: item.candidateRosterId,
    label: `${item.studentName}（${item.studentNo}）· ${candidateStatusLabel(item.status)}`,
    disabled: !isCandidateBindable(item),
  }
}

/**
 * 考试名册 remote 搜索与绑定前校验；供扫描工作台 Inspector、监控台绑定抽屉复用。
 */
export function useExamPaperBindCandidates(getExamId: () => string | undefined) {
  const candidateCache = ref(new Map<string, ExamCandidateResponse>())
  const candidateOptions = ref<DefaultOptionType[]>([])
  const candidatesLoading = ref(false)

  async function searchCandidates(keyword?: string): Promise<void> {
    const examId = getExamId()
    if (!examId) {
      candidateOptions.value = []
      return
    }
    candidatesLoading.value = true
    try {
      const page = await pageExamCandidates({
        examId,
        keyword: keyword?.trim() || undefined,
        pageNum: 1,
        pageSize: CANDIDATE_BIND_SEARCH_PAGE_SIZE,
      })
      candidateOptions.value = page.list.map((item) =>
        mapCandidateOption(item, candidateCache.value),
      )
    } catch (error) {
      candidateOptions.value = []
      showUserError(error, '考生名册搜索失败')
    } finally {
      candidatesLoading.value = false
    }
  }

  function resolveCandidateBindingBlockReason(candidateRosterId: string | undefined): string {
    if (!candidateRosterId) {
      return '请从名册中选择正确考生'
    }
    const candidate = candidateCache.value.get(candidateRosterId)
    if (!candidate) {
      return '所选考生不在当前搜索范围内，请重新搜索并选择'
    }
    if (!isCandidateBindable(candidate)) {
      return `${candidate.studentName}（${candidate.studentNo}）当前状态为${candidateStatusLabel(candidate.status)}，不能绑定试卷`
    }
    return ''
  }

  function resetCandidateSearch(): void {
    candidateOptions.value = []
    candidateCache.value = new Map()
  }

  return {
    candidateOptions,
    candidatesLoading,
    searchCandidates,
    resolveCandidateBindingBlockReason,
    resetCandidateSearch,
  }
}
