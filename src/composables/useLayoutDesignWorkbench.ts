import type { ExamDetailResponse } from '@/apis/mark/exam'
import type {
  ExamLayoutBlockDto,
  ExamLayoutDesignLoadResponse,
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
  ExamLayoutQuestionDto,
} from '@/apis/mark/exam-layout-design'
import type { MarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  autoDetectExamLayout,
  bootstrapExamLayoutDesign,
  cancelExamLayoutDetect,
  fetchExamLayoutDetectStatus,
  generateExamLayoutSheet,
  loadExamLayoutDesign,
  previewExamLayoutDesign,
  resolveExamLayoutDetectPollDeadlineMs,
  saveExamLayoutDesign,
} from '@/apis/mark/exam-layout-design'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ExamLayoutDetectTaskStatusCode, isExamLayoutDetectInFlightStatus, requireExamLayoutDetectTaskStatusCode } from '@/types/enums/exam-layout-detect-task-status-enum'
import { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  computeLayoutRoiStats,
  hasIdentityBlock,
  validateLayoutDocumentForSave,
} from '@/utils/exam-layout-designer'
import {
  isLayoutDesignPhaseAccessible,
  layoutDesignPhaseLockReason,
  layoutDesignPhaseQueryDrifted,
  normalizeLayoutDesignPhaseQuery,
  resolveAccessibleLayoutDesignPhase,
  resolveDefaultLayoutDesignPhase,
} from '@/utils/layout-design-workspace'
import { isLayoutDetectInFlightConflict } from '@/utils/marking-workflow-conflict'

export interface UseLayoutDesignWorkbenchOptions {
  examId: () => string
  examDetail: () => ExamDetailResponse | null | undefined
  workbenchContext: MarkWorkbenchContext | null
}

export function useLayoutDesignWorkbench(options: UseLayoutDesignWorkbenchOptions) {
  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const saving = ref(false)
  const generating = ref(false)
  const detecting = ref(false)
  const detectProgressText = ref('')
  const activeDetectTaskId = ref<string | null>(null)
  const detectPollingPolicy = ref<ExamLayoutDesignLoadResponse['detectPollingPolicy'] | null>(null)
  let detectSessionSeq = 0
  const previewing = ref(false)
  const layoutWritable = ref(true)
  const writeLockReason = ref<string>()
  const document = ref<ExamLayoutDocument | null>(null)
  const layoutPersisted = ref(false)
  const focusedBlockId = ref<string | null>(null)
  const focusedQuestionId = ref<string | null>(null)
  const currentPageNo = ref(1)
  const previewOpen = ref(false)
  const reviewOpen = ref(false)
  const previewPdfFileId = ref<string>()
  const cancellingDetect = ref(false)

  const defaultPhase = computed(() =>
    resolveDefaultLayoutDesignPhase(options.examDetail(), document.value),
  )

  const phase = computed({
    get: () => resolveAccessibleLayoutDesignPhase(
      document.value,
      route.query.phase,
      defaultPhase.value,
    ),
    set: (value: LayoutDesignPhaseCode) => {
      void router.replace({
        query: {
          ...route.query,
          phase: value,
        },
      })
    },
  })

  function ensurePhaseQuery(): void {
    const phaseQuery = route.query.phase
    const resolved = resolveAccessibleLayoutDesignPhase(
      document.value,
      phaseQuery,
      defaultPhase.value,
    )
    const normalized = normalizeLayoutDesignPhaseQuery(phaseQuery)
    const raw = Array.isArray(normalized) ? normalized[0] : normalized
    const needsReplace = !raw?.trim()
      || layoutDesignPhaseQueryDrifted(document.value, phaseQuery, defaultPhase.value)
    if (!needsReplace || raw === resolved) {
      return
    }
    void router.replace({
      query: {
        ...route.query,
        phase: resolved,
      },
    })
  }

  async function navigatePhase(nextPhase: LayoutDesignPhaseCode): Promise<void> {
    await router.replace({
      query: {
        ...route.query,
        phase: nextPhase,
      },
    })
  }

  const layoutCanvasReadonly = computed(() => !layoutWritable.value || detecting.value)

  const layoutRoiStats = computed(() => computeLayoutRoiStats(document.value))

  const identitySetupPending = computed(
    () => options.examDetail()?.materialLayoutMode === 'FULL_PAPER'
      && !detecting.value
      && Boolean(document.value)
      && !hasIdentityBlock(document.value),
  )

  const saveBlockingReasons = computed(() => validateLayoutDocumentForSave(document.value))

  const saveButtonDisabled = computed(
    () => !layoutWritable.value || detecting.value || saveBlockingReasons.value.length > 0,
  )

  const saveButtonTooltip = computed((): string | undefined => {
    if (detecting.value) {
      return '题目识别进行中，请等待完成后再保存'
    }
    if (!layoutWritable.value && writeLockReason.value) {
      return writeLockReason.value
    }
    if (saveBlockingReasons.value.length > 0) {
      return saveBlockingReasons.value.slice(0, 4).join('；')
    }
    return undefined
  })

  const previewDisabled = computed(() => {
    if (!options.examDetail()?.materialLayoutMode || !document.value) {
      return true
    }
    if (detecting.value) {
      return true
    }
    return saveBlockingReasons.value.length > 0
  })

  function goPhase(nextPhase: LayoutDesignPhaseCode): void {
    if (!isLayoutDesignPhaseAccessible(nextPhase, document.value)) {
      const reason = layoutDesignPhaseLockReason(nextPhase, document.value)
      if (reason) {
        void message.warning(reason)
      }
      return
    }
    phase.value = nextPhase
  }

  function patchDocument(next: ExamLayoutDocument): void {
    if (layoutCanvasReadonly.value) {
      if (detecting.value) {
        void message.warning('识别进行中，暂不可编辑制卷设计')
      } else if (writeLockReason.value) {
        void message.warning(writeLockReason.value)
      } else {
        void message.warning('当前制卷设计不可编辑')
      }
      return
    }
    document.value = next
  }

  function handleBlockFocus(block: ExamLayoutBlockDto | null): void {
    focusedBlockId.value = block?.id ?? null
    if (block?.pageNo != null) {
      currentPageNo.value = block.pageNo
    }
    if (block?.layoutQuestionId) {
      focusedQuestionId.value = block.layoutQuestionId
    } else if (block) {
      focusedQuestionId.value = null
    }
  }

  function handleQuestionFocus(question: ExamLayoutQuestionDto | null): void {
    focusedQuestionId.value = question?.id ?? null
    if (question) {
      focusedBlockId.value = null
    }
  }

  function handleBlockFocusFromOutline(block: ExamLayoutBlockDto | null, pageNo: number): void {
    currentPageNo.value = pageNo
    handleBlockFocus(block)
  }

  function handleAddIdentityBlock(block: ExamLayoutBlockDto): void {
    if (!document.value || layoutCanvasReadonly.value) {
      return
    }
    patchDocument({
      ...document.value,
      blocks: [...document.value.blocks, block],
    })
    currentPageNo.value = 1
    focusedBlockId.value = block.id
    focusedQuestionId.value = null
  }

  async function pollDetectStatus(detectTaskId: string, session: number): Promise<void> {
    const pollMs = resolveExamLayoutDetectPollDeadlineMs(detectPollingPolicy.value)
    if (pollMs == null) {
      showUserError(null, '制卷识别轮询策略缺失或无效，请刷新页面后重试')
      return
    }
    const deadline = Date.now() + pollMs
    while (Date.now() < deadline) {
      if (session !== detectSessionSeq) {
        return
      }
      const status = await fetchExamLayoutDetectStatus({
        examId: options.examId(),
        detectTaskId,
      })
      if (session !== detectSessionSeq) {
        return
      }
      if (status.progressTotalPages && status.progressTotalPages > 0) {
        detectProgressText.value = `正在识别第 ${status.progressPageNo ?? 0}/${status.progressTotalPages} 页`
      } else if (status.status === ExamLayoutDetectTaskStatusCode.QUEUED) {
        detectProgressText.value = '识别任务排队中'
      } else {
        detectProgressText.value = '正在识别题目并生成划区'
      }
      const taskStatus = requireExamLayoutDetectTaskStatusCode(status.status)
      if (taskStatus === ExamLayoutDetectTaskStatusCode.SUCCEEDED) {
        if (!status.document?.pages?.length) {
          showFormValidationMessage('识别完成但未返回制卷文档')
          return
        }
        if (session !== detectSessionSeq) {
          return
        }
        document.value = status.document
        layoutPersisted.value = true
        focusedQuestionId.value = document.value.questions?.[0]?.id ?? null
        focusedBlockId.value = null
        currentPageNo.value = document.value.pages[0].pageNo
        message.success('题目识别与划区已完成并自动保存草稿，请核对 ROI 后配置身份填涂区')
        await navigatePhase(LayoutDesignPhaseCode.QUESTIONS)
        await options.workbenchContext?.refreshChrome?.()
        return
      }
      if (taskStatus === ExamLayoutDetectTaskStatusCode.FAILED) {
        showFormValidationMessage(status.errorMessage || '自动预划区失败')
        return
      }
      if (taskStatus === ExamLayoutDetectTaskStatusCode.CANCELLED) {
        if (session === detectSessionSeq) {
          message.info('识别任务已结束，未保存本次识别结果，可重新上传源文件并识别')
          await reload()
        }
        return
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200)
      })
    }
    showFormValidationMessage('识别超时，请点击重新识别')
  }

  async function resumeActiveDetectPolling(
    loadResponse: ExamLayoutDesignLoadResponse,
    detectTaskId: string,
  ): Promise<void> {
    const session = ++detectSessionSeq
    detecting.value = true
    activeDetectTaskId.value = detectTaskId
    if (loadResponse.detectPollingPolicy) {
      detectPollingPolicy.value = loadResponse.detectPollingPolicy
    }
    detectProgressText.value = loadResponse.activeDetect?.status === ExamLayoutDetectTaskStatusCode.QUEUED
      ? '识别任务排队中'
      : '正在识别题目并生成划区'
    try {
      await pollDetectStatus(detectTaskId, session)
    } catch (error) {
      if (session === detectSessionSeq) {
        showUserError(error, '自动预划区失败')
        await reload()
      }
    } finally {
      if (session === detectSessionSeq) {
        detecting.value = false
        detectProgressText.value = ''
        activeDetectTaskId.value = null
      }
    }
  }

  async function tryResumeDetectOnInFlightConflict(session: number): Promise<boolean> {
    const examId = options.examId()
    if (!examId) {
      return false
    }
    const res = await loadExamLayoutDesign({ examId })
    layoutWritable.value = res.writable
    writeLockReason.value = res.writeLockReason
    detectPollingPolicy.value = res.detectPollingPolicy
    const detectTaskId = res.activeDetect?.detectTaskId
    const inFlightStatus = res.activeDetect?.status
      ? requireExamLayoutDetectTaskStatusCode(res.activeDetect.status)
      : null
    if (!detectTaskId || !inFlightStatus || !isExamLayoutDetectInFlightStatus(inFlightStatus) || !layoutWritable.value) {
      return false
    }
    if (session !== detectSessionSeq) {
      return true
    }
    await resumeActiveDetectPolling(res, detectTaskId)
    return true
  }

  async function reload(): Promise<void> {
    const examId = options.examId()
    if (!examId) {
      document.value = null
      layoutPersisted.value = false
      focusedBlockId.value = null
      focusedQuestionId.value = null
      currentPageNo.value = 1
      layoutWritable.value = true
      writeLockReason.value = undefined
      return
    }
    loading.value = true
    try {
      const res = await loadExamLayoutDesign({ examId })
      layoutWritable.value = res.writable
      writeLockReason.value = res.writeLockReason
      detectPollingPolicy.value = res.detectPollingPolicy
      if (res.document) {
        document.value = res.document
        layoutPersisted.value = true
      } else {
        const bootstrap = await bootstrapExamLayoutDesign({ examId })
        document.value = bootstrap.document
        layoutPersisted.value = bootstrap.persisted
      }
      if (document.value?.pages?.length) {
        currentPageNo.value = document.value.pages[0].pageNo
      }
      if (document.value?.questions?.length) {
        focusedQuestionId.value = document.value.questions[0].id
      }
      const inFlightTaskId = res.activeDetect?.detectTaskId
      const inFlightStatus = res.activeDetect?.status
        ? requireExamLayoutDetectTaskStatusCode(res.activeDetect.status)
        : null
      const shouldResumeDetect = Boolean(inFlightTaskId
        && inFlightStatus
        && isExamLayoutDetectInFlightStatus(inFlightStatus)
        && layoutWritable.value
        && !detecting.value)
      loading.value = false
      ensurePhaseQuery()
      if (shouldResumeDetect && inFlightTaskId) {
        activeDetectTaskId.value = inFlightTaskId
        await resumeActiveDetectPolling(res, inFlightTaskId)
      }
    } catch (error) {
      document.value = null
      layoutPersisted.value = false
      focusedBlockId.value = null
      focusedQuestionId.value = null
      currentPageNo.value = 1
      layoutWritable.value = false
      writeLockReason.value = '加载制卷设计失败，请刷新页面后重试'
      showUserError(error, '加载制卷设计失败')
      loading.value = false
    }
  }

  async function handleSave(): Promise<boolean> {
    const examId = options.examId()
    if (!document.value || !examId || !layoutWritable.value || detecting.value) {
      return false
    }
    if (saveBlockingReasons.value.length > 0) {
      message.warning(saveBlockingReasons.value[0])
      return false
    }
    saving.value = true
    try {
      document.value = await saveExamLayoutDesign({
        examId,
        document: { ...document.value, examId },
      })
      layoutPersisted.value = true
      message.success('制卷设计已保存')
      await options.workbenchContext?.refreshChrome?.()
      return true
    } catch (error) {
      showUserError(error, '保存制卷设计失败')
      return false
    } finally {
      saving.value = false
    }
  }

  async function handlePreview(): Promise<void> {
    const examId = options.examId()
    if (!examId || !document.value) {
      return
    }
    if (detecting.value) {
      message.warning('识别进行中，请等待完成后再预览')
      return
    }
    if (saveBlockingReasons.value.length > 0) {
      message.warning(saveBlockingReasons.value[0])
      return
    }
    previewing.value = true
    try {
      const res = await previewExamLayoutDesign({
        examId,
        document: { ...document.value, examId, previewPdfFileId: undefined },
      })
      previewPdfFileId.value = res.previewPdfFileId
      previewOpen.value = true
    } catch (error) {
      showUserError(error, '生成预览失败')
    } finally {
      previewing.value = false
    }
  }

  async function handleGenerateSheet(
    paperSpec: string,
    questions: ExamLayoutGenerateQuestionRequest[],
  ): Promise<void> {
    const examId = options.examId()
    if (!examId || !layoutWritable.value || detecting.value) {
      return
    }
    generating.value = true
    try {
      document.value = await generateExamLayoutSheet({ examId, paperSpec, questions })
      layoutPersisted.value = true
      if (document.value.pages?.length) {
        currentPageNo.value = document.value.pages[0].pageNo
      }
      message.success('标准答题卡已生成')
      await navigatePhase(LayoutDesignPhaseCode.LAYOUT)
      await options.workbenchContext?.refreshChrome?.()
    } catch (error) {
      showUserError(error, '生成答题卡失败')
    } finally {
      generating.value = false
    }
  }

  async function handleAutoDetect(sourcePdfFileId: string): Promise<void> {
    const examId = options.examId()
    if (!examId || !layoutWritable.value) {
      return
    }
    if (detecting.value) {
      message.warning('当前试卷正在识别题目，请稍候再重新上传或识别')
      return
    }
    const session = ++detectSessionSeq
    detecting.value = true
    detectProgressText.value = '识别任务排队中'
    let conflictResumed = false
    try {
      const started = await autoDetectExamLayout({ examId, sourcePdfFileId })
      if (session !== detectSessionSeq) {
        return
      }
      if (started.detectPollingPolicy) {
        detectPollingPolicy.value = started.detectPollingPolicy
      }
      if (!started.detectTaskId) {
        showUserError(new Error('识别任务未返回任务号'), '自动预划区失败')
        return
      }
      activeDetectTaskId.value = started.detectTaskId
      await pollDetectStatus(started.detectTaskId, session)
    } catch (error) {
      if (session !== detectSessionSeq) {
        return
      }
      if (isLayoutDetectInFlightConflict(error)) {
        message.info('识别任务仍在进行，已切换为查看识别进度')
        conflictResumed = await tryResumeDetectOnInFlightConflict(session)
        if (conflictResumed) {
          return
        }
      }
      showUserError(error, '自动预划区失败')
    } finally {
      if (session === detectSessionSeq && !conflictResumed) {
        detecting.value = false
        detectProgressText.value = ''
        activeDetectTaskId.value = null
      }
    }
  }

  async function handleCancelDetect(): Promise<void> {
    const examId = options.examId()
    if (!examId || !activeDetectTaskId.value || cancellingDetect.value) {
      return
    }
    const ok = await confirmAsync({
      title: '取消题目识别？',
      content: '取消后不会保存本次识别结果，可重新上传源文件并识别。',
      type: 'warning',
      okText: '取消识别',
    })
    if (!ok) {
      return
    }
    cancellingDetect.value = true
    const taskId = activeDetectTaskId.value
    detectSessionSeq += 1
    try {
      await cancelExamLayoutDetect({
        examId,
        detectTaskId: taskId,
      })
      detecting.value = false
      detectProgressText.value = ''
      activeDetectTaskId.value = null
      message.info('识别任务已取消')
    } catch (error) {
      showUserError(error, '取消识别失败')
      detecting.value = false
      detectProgressText.value = ''
      activeDetectTaskId.value = null
      await reload()
    } finally {
      cancellingDetect.value = false
    }
  }

  watch(
    () => options.examId(),
    () => {
      void reload()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    detectSessionSeq += 1
  })

  return {
    loading,
    saving,
    generating,
    detecting,
    detectProgressText,
    activeDetectTaskId,
    cancellingDetect,
    previewing,
    layoutWritable,
    writeLockReason,
    document,
    layoutPersisted,
    focusedBlockId,
    focusedQuestionId,
    currentPageNo,
    previewOpen,
    reviewOpen,
    previewPdfFileId,
    phase,
    layoutCanvasReadonly,
    layoutRoiStats,
    identitySetupPending,
    saveBlockingReasons,
    saveButtonDisabled,
    saveButtonTooltip,
    previewDisabled,
    goPhase,
    patchDocument,
    handleBlockFocus,
    handleQuestionFocus,
    handleBlockFocusFromOutline,
    handleAddIdentityBlock,
    reload,
    handleSave,
    handlePreview,
    handleGenerateSheet,
    handleAutoDetect,
    handleCancelDetect,
    isPhaseAccessible: (value: LayoutDesignPhaseCode) =>
      isLayoutDesignPhaseAccessible(value, document.value),
    phaseLockReason: (value: LayoutDesignPhaseCode) =>
      layoutDesignPhaseLockReason(value, document.value),
  }
}
