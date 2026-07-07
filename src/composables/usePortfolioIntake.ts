import type { Ref } from 'vue'
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioMaterialIntakeStatusVO,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioIntakeApi } from '@/apis/portfolio/intake'
import { PortfolioArchiveRecordStatusCode, PortfolioMaterialIntakeStageCode, PortfolioMaterialTypeCode } from '@/apis/portfolio/types'
import { AiTaskStatusCode } from '@/apis/quality/types'
import { usePolling } from '@/composables/usePolling'
import { showUserError } from '@/utils/error-handler'
import { hasPendingPortfolioCategoryChange } from '@/utils/portfolio-material-reassign'

const POLLING_STAGES: PortfolioMaterialIntakeStageCode[] = [
  PortfolioMaterialIntakeStageCode.OCR_PENDING,
  PortfolioMaterialIntakeStageCode.AI_PROCESSING,
]

const POLLING_AI_STATUSES: AiTaskStatusCode[] = [
  AiTaskStatusCode.PENDING,
  AiTaskStatusCode.PROCESSING,
]

function readRouteQueryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readDemoModeFromRoute(value: unknown): boolean {
  return value === '1' || value === 'true'
}

function inferMaterialType(fileName?: string): PortfolioMaterialTypeCode {
  const lower = (fileName ?? '').toLowerCase()
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return PortfolioMaterialTypeCode.CERTIFICATE
  }
  return PortfolioMaterialTypeCode.DOCUMENT
}

export function usePortfolioIntake(targetTeacherId: Ref<string | undefined>) {
  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const saving = ref(false)
  const submitting = ref(false)
  const reassigning = ref(false)
  const status = ref<PortfolioMaterialIntakeStatusVO | null>(null)
  const categoryId = ref(readRouteQueryString(route.query.categoryId))
  const materialId = ref(readRouteQueryString(route.query.materialId))
  const archiveRecordId = ref(readRouteQueryString(route.query.recordId))
  const taskId = ref(readRouteQueryString(route.query.taskId))
  const fieldValues = reactive<Record<string, string>>({})
  const evidenceRefs = reactive<Record<string, string>>({})

  const demoMode = computed(
    () => readDemoModeFromRoute(route.query.demoMode) || status.value?.demoMode === true,
  )

  const teacherRequest = computed(() =>
    targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  )

  const shouldPoll = computed(() => {
    if (!status.value) {
      return false
    }
    if (POLLING_STAGES.includes(status.value.stage)) {
      return true
    }
    return !!(status.value.aiTaskStatus && POLLING_AI_STATUSES.includes(status.value.aiTaskStatus))
  })

  const fieldReadOnly = computed(() => {
    if (!status.value) {
      return false
    }
    const stage = status.value.stage
    if (stage === PortfolioMaterialIntakeStageCode.SUBMITTED || stage === PortfolioMaterialIntakeStageCode.UNDER_REVIEW) {
      return true
    }
    if (stage === PortfolioMaterialIntakeStageCode.OCR_PENDING || stage === PortfolioMaterialIntakeStageCode.AI_PROCESSING) {
      return true
    }
    return (
      status.value.recordStatus === PortfolioArchiveRecordStatusCode.PENDING_CONFIRM
      || status.value.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL
    )
  })

  const aiCandidateReadOnly = computed(() => {
    const stage = status.value?.stage
    if (stage === PortfolioMaterialIntakeStageCode.SUBMITTED || stage === PortfolioMaterialIntakeStageCode.UNDER_REVIEW) {
      return true
    }
    return status.value?.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL
  })

  const readOnly = fieldReadOnly

  function syncFieldValuesFromStatus(next: PortfolioMaterialIntakeStatusVO) {
    for (const key of Object.keys(fieldValues)) {
      delete fieldValues[key]
    }
    for (const key of Object.keys(evidenceRefs)) {
      delete evidenceRefs[key]
    }
    for (const field of next.targetFields ?? []) {
      fieldValues[field.fieldCode] = ''
      evidenceRefs[field.fieldCode] = ''
    }
    for (const field of next.fieldValues ?? []) {
      fieldValues[field.fieldCode] = field.fieldValue ?? ''
      evidenceRefs[field.fieldCode] = field.evidenceRef ?? ''
    }
  }

  function applyStatus(next: PortfolioMaterialIntakeStatusVO) {
    status.value = next
    materialId.value = next.materialId
    archiveRecordId.value = next.archiveRecordId ?? archiveRecordId.value
    categoryId.value = next.categoryId ?? categoryId.value
    taskId.value = next.aiTaskId ?? taskId.value
    syncFieldValuesFromStatus(next)
  }

  async function refreshStatus() {
    if (!materialId.value) {
      status.value = null
      return
    }
    loading.value = true
    try {
      const next = await portfolioIntakeApi.getStatus({
        ...teacherRequest.value,
        materialId: materialId.value || undefined,
        demoMode: demoMode.value || undefined,
      })
      applyStatus(next)
    } catch (error) {
      showUserError(error, '加载采集状态失败')
    } finally {
      loading.value = false
    }
  }

  async function startIntake(options?: {
    fileNodeId?: string
    materialTitle?: string
    fileName?: string
    demoMode?: boolean
    /** 显式 true 时重新提交 AI；AI_FAILED 阶段默认不自动提交 */
    submitAi?: boolean
  }) {
    if (!targetTeacherId.value) {
      message.error('请先选择教师')
      return
    }
    const effectiveDemoMode = options?.demoMode ?? demoMode.value
    const effectiveCategoryId = categoryId.value || undefined
    const aiFailedStage = status.value?.stage === PortfolioMaterialIntakeStageCode.AI_FAILED
    const shouldSubmitAi
      = options?.submitAi === true
        || (options?.submitAi !== false
          && !effectiveDemoMode
          && Boolean(effectiveCategoryId)
          && !aiFailedStage)
    loading.value = true
    try {
      let frozenProviderChain: string | undefined
      if (!effectiveDemoMode) {
        const chainResult = await portfolioIntakeApi.getProviderChain()
        frozenProviderChain = chainResult.providerChain
      }
      const result = await portfolioIntakeApi.start({
        ...teacherRequest.value,
        materialId: materialId.value || undefined,
        categoryId: effectiveCategoryId,
        fileNodeId: options?.fileNodeId,
        materialTitle: options?.materialTitle,
        materialType: inferMaterialType(options?.fileName ?? options?.materialTitle),
        submitAi: shouldSubmitAi,
        demoMode: effectiveDemoMode || undefined,
        frozenProviderChain,
      })
      materialId.value = result.materialId
      taskId.value = result.aiTaskId ?? taskId.value
      await refreshStatus()
      return result
    } catch (error) {
      showUserError(error, '启动材料采集失败')
    } finally {
      loading.value = false
    }
  }

  function buildFieldInputs(): PortfolioArchiveRecordFieldInput[] {
    return Object.keys(fieldValues).map((fieldCode) => ({
      fieldCode,
      fieldValue: fieldValues[fieldCode],
      evidenceRef: evidenceRefs[fieldCode] || undefined,
    }))
  }

  function warnPendingCategoryChange(): boolean {
    if (
      hasPendingPortfolioCategoryChange(
        categoryId.value,
        status.value?.categoryId,
        status.value?.archiveRecordId,
      )
    ) {
      void message.warning('分类已变更，请先点击「重分类」确认后再保存或提交')
      return true
    }
    return false
  }

  async function saveDraft() {
    if (fieldReadOnly.value) {
      message.warning('当前阶段不可保存草稿，请先完成 AI 候选确认或等待处理结束')
      return
    }
    if (!status.value || !categoryId.value) {
      message.warning('请先选择档案分类')
      return
    }
    if (warnPendingCategoryChange()) {
      return
    }
    saving.value = true
    try {
      const result = await portfolioIntakeApi.saveDraft({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        recordId: archiveRecordId.value || undefined,
        categoryId: categoryId.value,
        fields: buildFieldInputs(),
        demoMode: demoMode.value || undefined,
      })
      applyStatus(result)
      message.success('草稿已保存')
    } catch (error) {
      showUserError(error, '保存草稿失败')
    } finally {
      saving.value = false
    }
  }

  async function submitIntake() {
    if (fieldReadOnly.value) {
      message.warning('当前阶段不可提交，请先完成 AI 候选确认或等待处理结束')
      return
    }
    if (!status.value || !categoryId.value) {
      message.warning('请先选择档案分类')
      return
    }
    if (warnPendingCategoryChange()) {
      return
    }
    submitting.value = true
    try {
      const result = await portfolioIntakeApi.submit({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        recordId: archiveRecordId.value || undefined,
        categoryId: categoryId.value,
        fields: buildFieldInputs(),
        demoMode: demoMode.value || undefined,
      })
      applyStatus(result)
      message.success('已提交审核')
      return result
    } catch (error) {
      showUserError(error, '提交审核失败')
    } finally {
      submitting.value = false
    }
  }

  async function reassignCategory(targetCategoryId: string) {
    if (!status.value?.materialId) {
      message.warning('请先登记材料后再重分类')
      return
    }
    if (targetCategoryId === status.value.categoryId) {
      message.warning('目标分类与当前分类相同，请选择其他分类')
      return
    }
    reassigning.value = true
    try {
      const result = await portfolioIntakeApi.reassignCategory({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        targetCategoryId,
      })
      categoryId.value = targetCategoryId
      archiveRecordId.value = result.archiveRecordId
      message.success(
        `重分类完成，复用 ${result.reusedFieldCount} 项，清空 ${result.clearedFieldCount} 项`,
      )
      await refreshStatus()
    } catch (error) {
      showUserError(error, '重分类失败')
    } finally {
      reassigning.value = false
    }
  }

  async function handleScanCommitted(options?: {
    scanFileNodeId?: string
    scanMaterialId?: string
    scanQualityAiTaskId?: string
  }) {
    if (!targetTeacherId.value) {
      return
    }
    if (options?.scanMaterialId) {
      materialId.value = options.scanMaterialId
      if (options.scanQualityAiTaskId) {
        taskId.value = options.scanQualityAiTaskId
      }
      await refreshStatus()
      return
    }
    if (!options?.scanFileNodeId) {
      return
    }
    await startIntake({
      fileNodeId: options.scanFileNodeId,
    })
  }

  async function clearScanCommittedQuery() {
    if (route.query.scanCommitted !== '1') {
      return false
    }
    const scanFileNodeId = readRouteQueryString(route.query.scanFileNodeId)
    const scanMaterialId = readRouteQueryString(route.query.scanMaterialId)
    const scanQualityAiTaskId = readRouteQueryString(route.query.scanQualityAiTaskId)
    const nextQuery = { ...route.query }
    delete nextQuery.scanCommitted
    delete nextQuery.scanFileNodeId
    delete nextQuery.scanMaterialId
    delete nextQuery.scanQualityAiTaskId
    await router.replace({ path: route.path, query: nextQuery })
    await handleScanCommitted({
      scanFileNodeId: scanFileNodeId || undefined,
      scanMaterialId: scanMaterialId || undefined,
      scanQualityAiTaskId: scanQualityAiTaskId || undefined,
    })
    return true
  }

  usePolling(
    async () => {
      await refreshStatus()
    },
    {
      getOptions: () => ({
        intervalMs: 4000,
        when: shouldPoll.value,
        immediate: false,
      }),
      pauseWhenDocumentHidden: true,
    },
  )

  return {
    loading,
    saving,
    submitting,
    reassigning,
    status,
    categoryId,
    materialId,
    archiveRecordId,
    taskId,
    fieldValues,
    evidenceRefs,
    readOnly,
    fieldReadOnly,
    aiCandidateReadOnly,
    shouldPoll,
    demoMode,
    refreshStatus,
    startIntake,
    saveDraft,
    submitIntake,
    reassignCategory,
    clearScanCommittedQuery,
  }
}

export function buildPortfolioIntakeScanReturnTo(query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  return `/portfolio/teacher/intake?${params.toString()}`
}
