import type { Ref } from 'vue'
import type {
  MarkingPageAnnotationSubmitItem,
  MarkingQuestionScoreSubmitItem,
  QuestionMarkingGroupQuestionVO,
  ScannedPageRef,
} from '@/apis/mark/marking-organization'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  getMarkingScanPageDisplayBlobUrl,
  getWholePaperView,
} from '@/apis/mark/marking-organization'
import { showUserError, toUserError } from '@/utils/error-handler'

const WHOLE_PAGE_ESTIMATED_HEIGHT = 1180
const WHOLE_PAGE_RENDER_BUFFER = 2
const WHOLE_PAGE_PRELOAD_BUFFER = 3

export interface VisibleWholePage {
  page: ScannedPageRef
  pageIndex: number
}

export interface WholeQuestionForm {
  score?: number
  annotationText: string
  correlationId: string
}

export interface UseWholePaperGalleryOptions {
  getExamId: () => string | undefined
  getTaskId: () => string | undefined
  isWholePaperTask: () => boolean
  onViewReady: () => void
}

/** 整卷影像画廊 composable 对外 API */
export interface UseWholePaperGalleryReturn {
  wholePages: Ref<ScannedPageRef[]>
  wholeQuestions: Ref<QuestionMarkingGroupQuestionVO[]>
  wholePagesLoaded: Ref<boolean>
  wholePagesLoading: Ref<boolean>
  wholePagesError: Ref<Error | null>
  wholePageImageUrls: Record<string, string>
  wholePageImageLoading: Record<string, boolean>
  wholePageImageErrors: Record<string, Error | null>
  wholeQuestionForms: Record<string, WholeQuestionForm>
  wholePageAnnotationForms: Record<string, string>
  wholePageViewportRef: Ref<HTMLElement | null>
  currentWholePageIndex: Ref<number>
  visibleWholePages: Ref<VisibleWholePage[]>
  wholePageTopSpacerHeight: Ref<number>
  wholePageBottomSpacerHeight: Ref<number>
  getWholeQuestionForm: (layoutQuestionId: string) => WholeQuestionForm
  openWholePaperView: () => Promise<void>
  reloadWholePaperView: () => Promise<void>
  resetWholePaperState: () => void
  handleWholePageGalleryScroll: (event: Event) => void
  scrollToWholePage: (index: number) => void
  buildWholePaperSubmitRequest: () => {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  }
}

/**
 * 整卷影像画廊：消费 WholePaperViewResponse，按 pageId 虚拟窗口渲染 ScannedPageRef。
 */
export function useWholePaperGallery(options: UseWholePaperGalleryOptions): UseWholePaperGalleryReturn {
  const wholePages = ref<ScannedPageRef[]>([])
  const wholeQuestions = ref<QuestionMarkingGroupQuestionVO[]>([])
  const wholePagesLoaded = ref(false)
  const wholePagesLoading = ref(false)
  const wholePagesError = ref<Error | null>(null)
  const wholePageImageUrls = reactive<Record<string, string>>({})
  const wholePageImageLoading = reactive<Record<string, boolean>>({})
  const wholePageImageErrors = reactive<Record<string, Error | null>>({})
  const wholeQuestionForms = reactive<Record<string, WholeQuestionForm>>({})
  const wholePageAnnotationForms = reactive<Record<string, string>>({})
  const wholePageViewportRef = ref<HTMLElement | null>(null)
  const wholePageScrollTop = ref(0)
  const wholePageViewportHeight = ref(900)
  const currentWholePageIndex = ref(0)
  let wholePageImageLoadBatch = 0

  const visibleWholePageRange = computed(() => {
    if (wholePages.value.length === 0) return { start: 0, end: -1 }
    const viewportStart = Math.floor(wholePageScrollTop.value / WHOLE_PAGE_ESTIMATED_HEIGHT)
    const viewportEnd = Math.ceil(
      (wholePageScrollTop.value + wholePageViewportHeight.value) / WHOLE_PAGE_ESTIMATED_HEIGHT,
    )
    return {
      start: Math.max(0, viewportStart - WHOLE_PAGE_RENDER_BUFFER),
      end: Math.min(wholePages.value.length - 1, viewportEnd + WHOLE_PAGE_RENDER_BUFFER),
    }
  })

  const visibleWholePages = computed<VisibleWholePage[]>(() => {
    const range = visibleWholePageRange.value
    if (range.end < range.start) return []
    return wholePages.value.slice(range.start, range.end + 1).map((page, offset) => ({
      page,
      pageIndex: range.start + offset,
    }))
  })

  const wholePageTopSpacerHeight = computed(() => (
    visibleWholePageRange.value.start * WHOLE_PAGE_ESTIMATED_HEIGHT
  ))

  const wholePageBottomSpacerHeight = computed(() => {
    const range = visibleWholePageRange.value
    if (range.end < range.start) return 0
    return Math.max(0, (wholePages.value.length - range.end - 1) * WHOLE_PAGE_ESTIMATED_HEIGHT)
  })

  function createCorrelationId(scope: 'question' | 'page', id: string): string {
    return `${scope}-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  function getWholeQuestionForm(layoutQuestionId: string): WholeQuestionForm {
    if (!wholeQuestionForms[layoutQuestionId]) {
      wholeQuestionForms[layoutQuestionId] = {
        score: undefined,
        annotationText: '',
        correlationId: createCorrelationId('question', layoutQuestionId),
      }
    }
    return wholeQuestionForms[layoutQuestionId]
  }

  function syncWholePaperForms(
    questions: QuestionMarkingGroupQuestionVO[],
    pages: ScannedPageRef[],
  ): void {
    for (const question of questions) {
      getWholeQuestionForm(question.layoutQuestionId)
    }
    for (const page of pages) {
      if (wholePageAnnotationForms[page.pageId] === undefined) {
        wholePageAnnotationForms[page.pageId] = ''
      }
    }
  }

  function clearWholePaperForms(): void {
    for (const key of Object.keys(wholeQuestionForms)) {
      delete wholeQuestionForms[key]
    }
    for (const key of Object.keys(wholePageAnnotationForms)) {
      delete wholePageAnnotationForms[key]
    }
  }

  function releaseWholePageImages(): void {
    wholePageImageLoadBatch += 1
    for (const url of Object.values(wholePageImageUrls)) {
      URL.revokeObjectURL(url)
    }
    for (const key of Object.keys(wholePageImageUrls)) {
      delete wholePageImageUrls[key]
    }
    for (const key of Object.keys(wholePageImageLoading)) {
      delete wholePageImageLoading[key]
    }
    for (const key of Object.keys(wholePageImageErrors)) {
      delete wholePageImageErrors[key]
    }
  }

  async function loadWholePageImage(page: ScannedPageRef, examId: string, taskId: string): Promise<string> {
    if (page.identityMaskedView) {
      return getMarkingScanPageDisplayBlobUrl({
        examId,
        taskId,
        pageId: page.pageId,
      })
    }
    if (!page.fileId) {
      throw new Error('扫描页缺少展示文件ID')
    }
    return getImageBlobUrl(page.fileId)
  }

  async function loadWholePageImageByPage(page: ScannedPageRef, batch = wholePageImageLoadBatch): Promise<void> {
    const examId = options.getExamId()
    const taskId = options.getTaskId()
    if (
      !examId
      || !taskId
      || wholePageImageUrls[page.pageId]
      || wholePageImageLoading[page.pageId]
    ) {
      return
    }
    wholePageImageLoading[page.pageId] = true
    wholePageImageErrors[page.pageId] = null
    try {
      const url = await loadWholePageImage(page, examId, taskId)
      if (batch !== wholePageImageLoadBatch) {
        URL.revokeObjectURL(url)
        return
      }
      wholePageImageUrls[page.pageId] = url
    } catch (error) {
      if (batch !== wholePageImageLoadBatch) return
      wholePageImageErrors[page.pageId] = toUserError(error, '扫描页图片加载失败')
    } finally {
      if (batch === wholePageImageLoadBatch) {
        wholePageImageLoading[page.pageId] = false
      }
    }
  }

  async function preloadWholePageImagesForWindow(): Promise<void> {
    const batch = wholePageImageLoadBatch
    const range = visibleWholePageRange.value
    if (range.end < range.start) return
    const start = Math.max(0, range.start - WHOLE_PAGE_PRELOAD_BUFFER)
    const end = Math.min(wholePages.value.length - 1, range.end + WHOLE_PAGE_PRELOAD_BUFFER)
    const queue = wholePages.value
      .slice(start, end + 1)
      .filter((page) => !wholePageImageUrls[page.pageId] && !wholePageImageLoading[page.pageId])
    const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length > 0) {
        if (batch !== wholePageImageLoadBatch) break
        const page = queue.shift()
        if (page) await loadWholePageImageByPage(page, batch)
      }
    })
    await Promise.all(workers)
  }

  async function openWholePaperView(): Promise<void> {
    const examId = options.getExamId()
    const taskId = options.getTaskId()
    if (!examId || !taskId) {
      return
    }
    wholePagesLoading.value = true
    wholePagesError.value = null
    try {
      const view = await getWholePaperView({ examId, taskId })
      wholePages.value = view.pages
      wholeQuestions.value = view.questions
      currentWholePageIndex.value = 0
      syncWholePaperForms(view.questions, view.pages)
      wholePagesLoaded.value = true
      options.onViewReady()
      window.requestAnimationFrame(() => {
        if (wholePageViewportRef.value) {
          wholePageViewportHeight.value = wholePageViewportRef.value.clientHeight
        }
        void preloadWholePageImagesForWindow()
      })
    } catch (error) {
      wholePagesError.value = toUserError(error, '阅卷影像加载失败')
      showUserError(error, '影像工作区加载失败')
    } finally {
      wholePagesLoading.value = false
    }
  }

  async function reloadWholePaperView(): Promise<void> {
    releaseWholePageImages()
    wholePages.value = []
    wholeQuestions.value = []
    clearWholePaperForms()
    wholePagesLoaded.value = false
    await openWholePaperView()
  }

  function handleWholePageGalleryScroll(event: Event): void {
    if (!(event.currentTarget instanceof HTMLElement)) return
    wholePageScrollTop.value = event.currentTarget.scrollTop
    wholePageViewportHeight.value = event.currentTarget.clientHeight
    currentWholePageIndex.value = Math.min(
      Math.max(Math.round(event.currentTarget.scrollTop / WHOLE_PAGE_ESTIMATED_HEIGHT), 0),
      Math.max(wholePages.value.length - 1, 0),
    )
  }

  function scrollToWholePage(index: number): void {
    if (wholePages.value.length === 0) return
    const nextIndex = Math.min(Math.max(index, 0), wholePages.value.length - 1)
    currentWholePageIndex.value = nextIndex
    const nextScrollTop = nextIndex * WHOLE_PAGE_ESTIMATED_HEIGHT
    if (wholePageViewportRef.value) {
      wholePageViewportRef.value.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
      return
    }
    wholePageScrollTop.value = nextScrollTop
    void preloadWholePageImagesForWindow()
  }

  function buildWholePaperSubmitRequest(): {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  } {
    if (wholeQuestions.value.length === 0) {
      throw new Error('当前任务负责题目未加载，请刷新后重试')
    }
    const questionScores: MarkingQuestionScoreSubmitItem[] = wholeQuestions.value.map((question) => {
      const questionForm = getWholeQuestionForm(question.layoutQuestionId)
      if (questionForm.score === undefined) {
        throw new Error(`请填写第 ${question.questionNo} 题给分`)
      }
      return {
        layoutQuestionId: question.layoutQuestionId,
        score: questionForm.score,
        annotationText: questionForm.annotationText.trim() || undefined,
        correlationId: questionForm.correlationId,
      }
    })
    const pageAnnotations: MarkingPageAnnotationSubmitItem[] = options.isWholePaperTask()
      ? wholePages.value
          .map(
            (page): MarkingPageAnnotationSubmitItem => ({
              pageId: page.pageId,
              annotationText: wholePageAnnotationForms[page.pageId]?.trim() || '',
              correlationId: createCorrelationId('page', page.pageId),
            }),
          )
          .filter((item) => item.annotationText.length > 0)
      : []
    return { questionScores, pageAnnotations }
  }

  function resetWholePaperState(): void {
    releaseWholePageImages()
    wholePages.value = []
    wholeQuestions.value = []
    wholePageScrollTop.value = 0
    wholePageViewportHeight.value = 900
    currentWholePageIndex.value = 0
    clearWholePaperForms()
    wholePagesLoaded.value = false
    wholePagesLoading.value = false
    wholePagesError.value = null
  }

  watch(
    () => [
      visibleWholePageRange.value.start,
      visibleWholePageRange.value.end,
      wholePages.value.length,
    ],
    () => {
      void preloadWholePageImagesForWindow()
    },
  )

  onBeforeUnmount(() => {
    releaseWholePageImages()
  })

  return {
    wholePages,
    wholeQuestions,
    wholePagesLoaded,
    wholePagesLoading,
    wholePagesError,
    wholePageImageUrls,
    wholePageImageLoading,
    wholePageImageErrors,
    wholeQuestionForms,
    wholePageAnnotationForms,
    wholePageViewportRef,
    currentWholePageIndex,
    visibleWholePages,
    wholePageTopSpacerHeight,
    wholePageBottomSpacerHeight,
    getWholeQuestionForm,
    openWholePaperView,
    reloadWholePaperView,
    resetWholePaperState,
    handleWholePageGalleryScroll,
    scrollToWholePage,
    buildWholePaperSubmitRequest,
  }
}
