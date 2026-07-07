import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
/**
 * 批改主链公共考试选择器 composable
 *
 * - 默认从 URL `query.examId` 初始化
 * - 下拉默认展示租户可见 ACTIVE 考试的前 20 条（create_time desc）
 * - 输入关键词走后端 keyword 模糊搜索（exam_name / exam_no），不客户端全量过滤
 * - URL / Store 预选考试若不在当前页，通过详情接口补全标签，避免 Select 展示裸 ID
 */
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExamStatusCode, getExamDetail, pageExams } from '@/apis/mark/exam'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'
import { examSummaryFromDetail, toMarkExamSelectOption } from '@/utils/mark-exam-option'
/** 下拉默认展示条数（与后端分页一致，不做全量 readAllPages） */
export const MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE = 20

const EXAM_SEARCH_DEBOUNCE_MS = 300

export interface MarkExamSelectorOptions {
  /** 是否在切换时自动回写 URL query，默认 true */
  syncUrl?: boolean
  /** 下拉默认条数，默认 20 */
  pageSize?: number
}

export type { MarkExamSelectOption }

export function useMarkExamSelector(options: MarkExamSelectorOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const examContext = useMarkExamContextStore()
  const markStageStore = useMarkStageStore()

  const syncUrl = options.syncUrl ?? true
  const pageSize = options.pageSize ?? MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE

  const exams = ref<ExamSummaryResponse[]>([])
  /** 当前选中考试：不在分页结果内时由详情补全，保证 Select 有 label */
  const pinnedExam = ref<ExamSummaryResponse | null>(null)
  const loading = ref(false)
  const searching = ref(false)
  const resolvingPinned = ref(false)
  const searchKeyword = ref('')

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

  const initialId
    = (route.query.examId ? String(route.query.examId) : '') || examContext.currentExamId || ''
  const selectedExamId = ref<string | undefined>(initialId || undefined)

  watch(selectedExamId, (next) => {
    if (next && next !== examContext.currentExamId) {
      void examContext.setCurrentExam(next, { ensureDetail: true })
    } else if (!next && examContext.currentExamId) {
      void examContext.setCurrentExam('')
    }
    void syncPinnedExam(next)
  })

  watch(
    () => examContext.currentExamId,
    (next) => {
      if (next && next !== selectedExamId.value) {
        selectedExamId.value = next
        if (syncUrl) writeExamIdToUrl(next)
      }
    },
  )

  const selectedExam = computed<ExamSummaryResponse | null>(() => {
    const id = selectedExamId.value
    if (!id) return null
    return exams.value.find((item) => item.examId === id)
      ?? (pinnedExam.value?.examId === id ? pinnedExam.value : null)
  })

  const examOptions = computed<MarkExamSelectOption[]>(() => {
    const merged = new Map<string, MarkExamSelectOption>()
    if (pinnedExam.value) {
      merged.set(pinnedExam.value.examId, toMarkExamSelectOption(pinnedExam.value))
    }
    for (const item of exams.value) {
      merged.set(item.examId, toMarkExamSelectOption(item))
    }
    return Array.from(merged.values())
  })

  /** 仅当 options 中已有 label 时才绑定 value，避免展示裸 examId */
  const selectedExamSelectValue = computed(() => {
    const id = selectedExamId.value
    if (!id) return undefined
    return examOptions.value.some((option) => option.value === id) ? id : undefined
  })

  const selectedExamLabel = computed(() => {
    if (markStageStore.selectedExamLabel) {
      return markStageStore.selectedExamLabel
    }
    const exam = selectedExam.value
    if (!exam) {
      return ''
    }
    return exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
  })

  function buildPageRequest(keyword?: string) {
    return {
      pageNum: 1,
      pageSize,
      status: ExamStatusCode.ACTIVE,
      keyword: keyword?.trim() || undefined,
    }
  }

  async function fetchExamPage(keyword?: string): Promise<ExamSummaryResponse[]> {
    const result = await pageExams(buildPageRequest(keyword))
    return result.list
  }

  async function loadExams(keyword?: string): Promise<void> {
    loading.value = true
    try {
      exams.value = await fetchExamPage(keyword)
      examContext.exams = exams.value
      searchKeyword.value = keyword?.trim() ?? ''
      await ensureDefaultSelection()
      await syncPinnedExam(selectedExamId.value)
    } catch (error) {
      exams.value = []
      examContext.exams = []
      showUserError(error, '考试列表加载失败')
    } finally {
      loading.value = false
    }
  }

  async function searchExams(keyword: string): Promise<void> {
    searching.value = true
    try {
      exams.value = await fetchExamPage(keyword)
      examContext.exams = exams.value
      searchKeyword.value = keyword.trim()
      await syncPinnedExam(selectedExamId.value)
    } catch (error) {
      showUserError(error, '考试搜索失败')
    } finally {
      searching.value = false
    }
  }

  function onExamSearch(keyword: string): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
      void searchExams(keyword)
    }, EXAM_SEARCH_DEBOUNCE_MS)
  }

  async function ensureDefaultSelection(): Promise<void> {
    if (!selectedExamId.value && exams.value.length > 0) {
      selectedExamId.value = exams.value[0].examId
      if (syncUrl) {
        writeExamIdToUrl(selectedExamId.value)
      }
      return
    }
    if (selectedExamId.value) {
      await examContext.setCurrentExam(selectedExamId.value, { ensureDetail: true })
    }
  }

  async function syncPinnedExam(examId: string | undefined): Promise<void> {
    if (!examId) {
      pinnedExam.value = null
      return
    }

    const inPage = exams.value.find((item) => item.examId === examId)
    if (inPage) {
      pinnedExam.value = inPage
      return
    }

    const cachedDetail = examContext.currentExamDetail
    if (cachedDetail?.examId === examId) {
      pinnedExam.value = examSummaryFromDetail(cachedDetail)
      return
    }

    resolvingPinned.value = true
    try {
      pinnedExam.value = examSummaryFromDetail(await getExamDetail(examId))
    } catch (error) {
      pinnedExam.value = null
      showUserError(error, '当前考试不存在或无权访问')
      selectedExamId.value = undefined
      if (syncUrl) writeExamIdToUrl(undefined)
    } finally {
      resolvingPinned.value = false
    }
  }

  function writeExamIdToUrl(examId: string | undefined): void {
    const nextQuery = { ...route.query }
    if (examId) {
      nextQuery.examId = examId
    } else {
      delete nextQuery.examId
    }
    void router.replace({ query: nextQuery })
  }

  function onExamChange(
    value: SelectValue,
    _option?: DefaultOptionType | DefaultOptionType[],
  ): void {
    const examId = value != null ? String(value) : undefined
    selectedExamId.value = examId
    if (syncUrl) {
      writeExamIdToUrl(examId)
    }
  }

  async function init(): Promise<void> {
    await loadExams()
  }

  return {
    exams,
    examOptions,
    loading,
    searching,
    resolvingPinned,
    selectedExamId,
    selectedExamSelectValue,
    selectedExam,
    selectedExamLabel,
    loadExams,
    searchExams,
    onExamSearch,
    onExamChange,
    syncPinnedExam,
    init,
  }
}
