import type { ExamDetailResponse } from '@/apis/mark/exam'
import type {
  ExamLayoutBlockDto,
  ExamLayoutDesignLoadResponse,
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
  ExamLayoutQuestionDto,
} from '@/apis/mark/exam-layout-design'
import type { MarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import message from 'ant-design-vue/es/message'
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
import {
  ExamLayoutDetectTaskStatusCode,
  isExamLayoutDetectInFlightStatus,
  requireExamLayoutDetectTaskStatusCode,
} from '@/types/enums/exam-layout-detect-task-status-enum'
import { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
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
import { fingerprintLayoutDocument } from '@/utils/layout-document-fingerprint'
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
  // MVR-274：默认只读，待 load 返回 writable 后再开放；避免加载前假可写
  const layoutWritable = ref(false)
  const writeLockReason = ref<string>()
  const document = ref<ExamLayoutDocument | null>(null)
  const layoutPersisted = ref(false)
  /** 最近一次已与后端对齐的文档指纹；与当前 document 比较得到 dirty。 */
  const persistedDocumentFingerprint = ref('')
  const layoutDirty = computed(
    () => fingerprintLayoutDocument(document.value) !== persistedDocumentFingerprint.value,
  )
  type LayoutDetectOutcome = 'idle' | 'running' | 'failed' | 'cancelled' | 'timeout'
  const detectOutcome = ref<LayoutDetectOutcome>('idle')
  const detectErrorMessage = ref('')
  type LayoutMutationOutcome = 'idle' | 'save-failed' | 'preview-failed'
  const mutationOutcome = ref<LayoutMutationOutcome>('idle')
  const mutationErrorMessage = ref('')
  let loadGeneration = 0
  let revertingExamSwitch = false
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
    get: () =>
      resolveAccessibleLayoutDesignPhase(document.value, route.query.phase, defaultPhase.value),
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
    const needsReplace
      = !raw?.trim() || layoutDesignPhaseQueryDrifted(document.value, phaseQuery, defaultPhase.value)
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
    () =>
      options.examDetail()?.materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER
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

  /**
   * MVR-411：预览分闸。
   * - 可写（layoutWritable）：携带本地 document 生成瞬时预览，须过保存校验。
   * - 只读：不传 document，走 BE 已落库文档读路径（评阅读权限），不叠主考写/保存校验。
   */
  const previewDisabled = computed(() => {
    if (!options.examDetail()?.materialLayoutMode) {
      return true
    }
    if (detecting.value) {
      return true
    }
    if (layoutWritable.value) {
      if (!document.value) {
        return true
      }
      return saveBlockingReasons.value.length > 0
    }
    // 只读：本地无 document 时仍允许点预览，由 BE load 已落库文档
    return false
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

  function markDocumentAligned(next: ExamLayoutDocument | null, persisted: boolean): void {
    document.value = next
    layoutPersisted.value = persisted
    persistedDocumentFingerprint.value = fingerprintLayoutDocument(next)
  }

  function clearDetectOutcome(): void {
    detectOutcome.value = 'idle'
    detectErrorMessage.value = ''
  }

  function clearMutationOutcome(): void {
    mutationOutcome.value = 'idle'
    mutationErrorMessage.value = ''
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
      showUserError(null, '制卷识别轮询策略缺失或无效')
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
        markDocumentAligned(status.document, true)
        detectOutcome.value = 'idle'
        detectErrorMessage.value = ''
        focusedQuestionId.value = status.document.questions?.[0]?.id ?? null
        focusedBlockId.value = null
        currentPageNo.value = status.document.pages[0].pageNo
        void message.success('题目识别与划区已完成并自动保存草稿，请核对 ROI 后配置身份填涂区')
        await navigatePhase(LayoutDesignPhaseCode.QUESTIONS)
        await options.workbenchContext?.refreshChrome?.()
        return
      }
      if (taskStatus === ExamLayoutDetectTaskStatusCode.FAILED) {
        detectOutcome.value = 'failed'
        detectErrorMessage.value = status.errorMessage?.trim() || '自动预划区失败'
        showFormValidationMessage(detectErrorMessage.value)
        return
      }
      if (taskStatus === ExamLayoutDetectTaskStatusCode.CANCELLED) {
        if (session === detectSessionSeq) {
          detectOutcome.value = 'cancelled'
          detectErrorMessage.value = '识别任务已取消，未保存本次识别结果'
          void message.info(detectErrorMessage.value)
          await reload()
        }
        return
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200)
      })
    }
    detectOutcome.value = 'timeout'
    detectErrorMessage.value = '识别超时，请回到源文件阶段重新识别'
    showFormValidationMessage(detectErrorMessage.value)
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
    detectProgressText.value
      = loadResponse.activeDetect?.status === ExamLayoutDetectTaskStatusCode.QUEUED
        ? '识别任务排队中'
        : '正在识别题目并生成划区'
    try {
      await pollDetectStatus(detectTaskId, session)
    } catch (error) {
      if (session === detectSessionSeq) {
        detectOutcome.value = 'failed'
        detectErrorMessage.value
          = error instanceof Error && error.message.trim()
            ? error.message.trim()
            : '自动预划区失败'
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
    // MVR-384：layoutWritable 承接 BE loadExamLayoutDesign.writable（合同 boolean）
    layoutWritable.value = res.writable
    writeLockReason.value = res.writeLockReason
    detectPollingPolicy.value = res.detectPollingPolicy
    const detectTaskId = res.activeDetect?.detectTaskId
    const inFlightStatus = res.activeDetect?.status
      ? requireExamLayoutDetectTaskStatusCode(res.activeDetect.status)
      : null
    if (
      !detectTaskId
      || !inFlightStatus
      || !isExamLayoutDetectInFlightStatus(inFlightStatus)
      || !layoutWritable.value
    ) {
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
    const generation = ++loadGeneration
    detectSessionSeq += 1
    clearDetectOutcome()
    if (!examId) {
      markDocumentAligned(null, false)
      focusedBlockId.value = null
      focusedQuestionId.value = null
      currentPageNo.value = 1
      layoutWritable.value = false
      writeLockReason.value = undefined
      return
    }
    loading.value = true
    try {
      const res = await loadExamLayoutDesign({ examId })
      if (generation !== loadGeneration || options.examId() !== examId) {
        return
      }
      layoutWritable.value = res.writable
      writeLockReason.value = res.writeLockReason
      detectPollingPolicy.value = res.detectPollingPolicy
      if (res.document) {
        markDocumentAligned(res.document, true)
      } else {
        const bootstrap = await bootstrapExamLayoutDesign({ examId })
        if (generation !== loadGeneration || options.examId() !== examId) {
          return
        }
        markDocumentAligned(bootstrap.document, bootstrap.persisted)
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
      const shouldResumeDetect = Boolean(
        inFlightTaskId
        && inFlightStatus
        && isExamLayoutDetectInFlightStatus(inFlightStatus)
        && layoutWritable.value
        && !detecting.value,
      )
      loading.value = false
      ensurePhaseQuery()
      if (shouldResumeDetect && inFlightTaskId) {
        activeDetectTaskId.value = inFlightTaskId
        detectOutcome.value = 'running'
        await resumeActiveDetectPolling(res, inFlightTaskId)
      }
    } catch (error) {
      if (generation !== loadGeneration || options.examId() !== examId) {
        return
      }
      markDocumentAligned(null, false)
      focusedBlockId.value = null
      focusedQuestionId.value = null
      currentPageNo.value = 1
      layoutWritable.value = false
      writeLockReason.value = '加载制卷设计失败，请返回后重新进入'
      showUserError(error, '加载制卷设计失败')
      loading.value = false
    }
  }

  async function handleSave(): Promise<boolean> {
    const examId = options.examId()
    if (!document.value || !examId || !layoutWritable.value || detecting.value) {
      return false
    }
    if (saving.value) {
      return false
    }
    if (saveBlockingReasons.value.length > 0) {
      void message.warning(saveBlockingReasons.value[0])
      return false
    }
    saving.value = true
    clearMutationOutcome()
    try {
      document.value = await saveExamLayoutDesign({
        examId,
        document: { ...document.value, examId },
      })
      markDocumentAligned(document.value, true)
      void message.success('制卷设计已保存')
      await options.workbenchContext?.refreshChrome?.()
      return true
    } catch (error) {
      mutationOutcome.value = 'save-failed'
      mutationErrorMessage.value
        = error instanceof Error && error.message.trim()
          ? error.message.trim()
          : '保存制卷设计失败'
      showUserError(error, '保存制卷设计失败')
      return false
    } finally {
      saving.value = false
    }
  }

  async function handlePreview(): Promise<void> {
    const examId = options.examId()
    if (!examId) {
      return
    }
    if (detecting.value) {
      void message.warning('识别进行中，请等待完成后再预览')
      return
    }
    // MVR-411：可写预览须本地 document + 保存校验；只读预览不传 document
    const writablePreview = layoutWritable.value
    if (writablePreview) {
      if (!document.value) {
        return
      }
      if (saveBlockingReasons.value.length > 0) {
        void message.warning(saveBlockingReasons.value[0])
        return
      }
    }
    previewing.value = true
    clearMutationOutcome()
    try {
      const res = await previewExamLayoutDesign(
        writablePreview && document.value
          ? {
              examId,
              document: { ...document.value, examId, previewPdfFileId: undefined },
            }
          : { examId },
      )
      if (!res.previewPdfFileId) {
        void message.warning('当前尚无可预览的制卷文档')
        return
      }
      previewPdfFileId.value = res.previewPdfFileId
      previewOpen.value = true
    } catch (error) {
      mutationOutcome.value = 'preview-failed'
      mutationErrorMessage.value
        = error instanceof Error && error.message.trim()
          ? error.message.trim()
          : '生成预览失败'
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
    if (generating.value) {
      return
    }
    generating.value = true
    try {
      document.value = await generateExamLayoutSheet({ examId, paperSpec, questions })
      markDocumentAligned(document.value, true)
      if (document.value.pages?.length) {
        currentPageNo.value = document.value.pages[0].pageNo
      }
      void message.success('标准答题纸已生成')
      await navigatePhase(LayoutDesignPhaseCode.LAYOUT)
      await options.workbenchContext?.refreshChrome?.()
    } catch (error) {
      showUserError(error, '生成答题纸失败')
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
      void message.warning('当前试卷正在识别题目，请稍候再重新上传或识别')
      return
    }
    const session = ++detectSessionSeq
    detecting.value = true
    detectOutcome.value = 'running'
    detectErrorMessage.value = ''
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
        detectOutcome.value = 'failed'
        detectErrorMessage.value = '识别任务未返回任务号'
        showUserError(new Error(detectErrorMessage.value), '自动预划区失败')
        return
      }
      activeDetectTaskId.value = started.detectTaskId
      await pollDetectStatus(started.detectTaskId, session)
    } catch (error) {
      if (session !== detectSessionSeq) {
        return
      }
      if (isLayoutDetectInFlightConflict(error)) {
        void message.info('识别任务仍在进行，已切换为查看识别进度')
        conflictResumed = await tryResumeDetectOnInFlightConflict(session)
        if (conflictResumed) {
          return
        }
      }
      detectOutcome.value = 'failed'
      detectErrorMessage.value = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : '自动预划区失败'
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
    // MVR-414：与 BE cancelDetect（owner+ACTIVE+assertLayoutWritable）二次闸；关考/只读漂移不发取消
    if (!examId || !layoutWritable.value || !activeDetectTaskId.value || cancellingDetect.value) {
      if (examId && !layoutWritable.value && activeDetectTaskId.value) {
        void message.warning(writeLockReason.value || '当前制卷只读，无法取消识别')
      }
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
      detectOutcome.value = 'cancelled'
      detectErrorMessage.value = '识别任务已取消，未保存本次识别结果'
      void message.info(detectErrorMessage.value)
    } catch (error) {
      showUserError(error, '取消识别失败')
      detecting.value = false
      detectProgressText.value = ''
      activeDetectTaskId.value = null
      detectOutcome.value = 'failed'
      detectErrorMessage.value = '取消识别失败'
      await reload()
    } finally {
      cancellingDetect.value = false
    }
  }

  watch(
    () => options.examId(),
    async (nextExamId, previousExamId) => {
      if (
        previousExamId
        && nextExamId
        && previousExamId !== nextExamId
        && layoutDirty.value
      ) {
        const discard = await confirmAsync({
          title: '制卷设计尚未保存',
          content: '切换考试将丢失未保存改动。可先保存设计，或确认丢弃后切换。',
          type: 'warning',
          okText: '丢弃并切换',
          cancelText: '留在当前考试',
        })
        if (!discard) {
          revertingExamSwitch = true
          try {
            await router.replace({
              name: route.name ?? undefined,
              params: { ...route.params, examId: previousExamId },
              query: route.query,
            })
          } finally {
            revertingExamSwitch = false
          }
          return
        }
      }
      if (revertingExamSwitch) {
        return
      }
      void reload()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    detectSessionSeq += 1
    loadGeneration += 1
  })

  return {
    loading,
    saving,
    generating,
    detecting,
    detectProgressText,
    detectOutcome,
    detectErrorMessage,
    clearDetectOutcome,
    mutationOutcome,
    mutationErrorMessage,
    clearMutationOutcome,
    activeDetectTaskId,
    cancellingDetect,
    previewing,
    layoutWritable,
    writeLockReason,
    document,
    layoutPersisted,
    layoutDirty,
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
