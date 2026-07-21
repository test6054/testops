import type { Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioMaterialIntakeStatusVO,
} from '@/apis/portfolio/types'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioMaterialIntakeStageCode,
  PortfolioMaterialTypeCode,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { useRoute, useRouter } from 'vue-router'
import { portfolioIntakeApi } from '@/apis/portfolio/intake'
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
  const intakeRequestToken = ref(0)

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
    if (
      stage === PortfolioMaterialIntakeStageCode.SUBMITTED ||
      stage === PortfolioMaterialIntakeStageCode.UNDER_REVIEW ||
      stage === PortfolioMaterialIntakeStageCode.CANDIDATES_REJECTED
    ) {
      return true
    }
    if (
      stage === PortfolioMaterialIntakeStageCode.OCR_PENDING ||
      stage === PortfolioMaterialIntakeStageCode.AI_PROCESSING
    ) {
      return true
    }
    return (
      status.value.recordStatus === PortfolioArchiveRecordStatusCode.PENDING_CONFIRM ||
      status.value.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL
    )
  })

  const aiCandidateReadOnly = computed(() => {
    const stage = status.value?.stage
    if (
      stage === PortfolioMaterialIntakeStageCode.SUBMITTED ||
      stage === PortfolioMaterialIntakeStageCode.UNDER_REVIEW
    ) {
      return true
    }
    return status.value?.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL
  })

  const readOnly = fieldReadOnly
  const writePending = computed(
    () => saving.value || submitting.value || reassigning.value || loading.value,
  )

  function resetIntakeContext() {
    intakeRequestToken.value += 1
    status.value = null
    categoryId.value = ''
    materialId.value = ''
    archiveRecordId.value = ''
    taskId.value = ''
    for (const key of Object.keys(fieldValues)) {
      delete fieldValues[key]
    }
    for (const key of Object.keys(evidenceRefs)) {
      delete evidenceRefs[key]
    }
  }

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
    archiveRecordId.value = next.archiveRecordId ?? ''
    categoryId.value = next.categoryId ?? ''
    taskId.value = next.aiTaskId ?? ''
    syncFieldValuesFromStatus(next)
  }

  async function refreshStatus() {
    const requestToken = intakeRequestToken.value
    if (!materialId.value && !taskId.value) {
      if (intakeRequestToken.value === requestToken) {
        status.value = null
      }
      return
    }
    loading.value = true
    try {
      const next = await portfolioIntakeApi.getStatus({
        ...teacherRequest.value,
        materialId: materialId.value || undefined,
        aiTaskId: taskId.value || undefined,
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      applyStatus(next)
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '加载采集状态失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        loading.value = false
      }
    }
  }

  async function startIntake(options?: {
    fileNodeId?: string
    materialTitle?: string
    fileName?: string
    /** 显式 true 时重新提交 AI；AI_FAILED 阶段默认不自动提交 */
    submitAi?: boolean
  }) {
    if (writePending.value) {
      void message.warning('材料采集操作正在处理，请勿重复提交')
      return
    }
    if (!targetTeacherId.value) {
      void message.error('请先选择教师')
      return
    }
    const requestToken = intakeRequestToken.value
    const effectiveCategoryId = categoryId.value || undefined
    const aiFailedStage = status.value?.stage === PortfolioMaterialIntakeStageCode.AI_FAILED
    const shouldSubmitAi =
      options?.submitAi === true ||
      (options?.submitAi !== false && Boolean(effectiveCategoryId) && !aiFailedStage)
    loading.value = true
    try {
      const chainResult = await portfolioIntakeApi.getProviderChain()
      const result = await portfolioIntakeApi.start({
        ...teacherRequest.value,
        materialId: materialId.value || undefined,
        categoryId: effectiveCategoryId,
        fileNodeId: options?.fileNodeId,
        materialTitle: options?.materialTitle,
        materialType: inferMaterialType(options?.fileName ?? options?.materialTitle),
        submitAi: shouldSubmitAi,
        frozenProviderChain: chainResult.providerChain,
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      materialId.value = result.materialId
      taskId.value = result.aiTaskId ?? ''
      await refreshStatus()
      return result
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '启动材料采集失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        loading.value = false
      }
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
    if (writePending.value) {
      void message.warning('材料采集操作正在处理，请勿重复提交')
      return
    }
    if (fieldReadOnly.value) {
      void message.warning('当前阶段不可保存草稿，请先完成智能分析候选确认或等待处理结束')
      return
    }
    if (!status.value || !categoryId.value) {
      void message.warning('请先选择档案分类')
      return
    }
    if (warnPendingCategoryChange()) {
      return
    }
    const requestToken = intakeRequestToken.value
    saving.value = true
    try {
      const result = await portfolioIntakeApi.saveDraft({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        recordId: archiveRecordId.value || undefined,
        categoryId: categoryId.value,
        fields: buildFieldInputs(),
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      applyStatus(result)
      void message.success('草稿已保存')
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '保存草稿失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        saving.value = false
      }
    }
  }

  /** 恢复候选均驳回材料，保留原作废档案证据并回到可重新选择分类的待采集状态。 */
  async function restartRejectedCandidates() {
    if (writePending.value) {
      void message.warning('材料采集操作正在处理，请勿重复提交')
      return
    }
    if (!status.value) {
      return
    }
    const requestToken = intakeRequestToken.value
    loading.value = true
    try {
      const next = await portfolioIntakeApi.restartRejected({
        ...teacherRequest.value,
        materialId: status.value.materialId,
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      applyStatus(next)
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '恢复重新采集失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        loading.value = false
      }
    }
  }

  async function submitIntake() {
    if (writePending.value) {
      void message.warning('材料采集操作正在处理，请勿重复提交')
      return
    }
    if (fieldReadOnly.value) {
      void message.warning('当前阶段不可提交，请先完成智能分析候选确认或等待处理结束')
      return
    }
    if (!status.value || !categoryId.value) {
      void message.warning('请先选择档案分类')
      return
    }
    if (warnPendingCategoryChange()) {
      return
    }
    const requestToken = intakeRequestToken.value
    submitting.value = true
    try {
      const result = await portfolioIntakeApi.submit({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        recordId: archiveRecordId.value || undefined,
        categoryId: categoryId.value,
        fields: buildFieldInputs(),
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      applyStatus(result)
      void message.success('已提交审核')
      return result
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '提交审核失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        submitting.value = false
      }
    }
  }

  async function reassignCategory(targetCategoryId: string) {
    if (writePending.value) {
      void message.warning('材料采集操作正在处理，请勿重复提交')
      return
    }
    if (!status.value?.materialId) {
      void message.warning('请先登记材料后再重分类')
      return
    }
    if (targetCategoryId === status.value.categoryId) {
      void message.warning('目标分类与当前分类相同，请选择其他分类')
      return
    }
    const requestToken = intakeRequestToken.value
    reassigning.value = true
    try {
      const result = await portfolioIntakeApi.reassignCategory({
        ...teacherRequest.value,
        materialId: status.value.materialId,
        targetCategoryId,
      })
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      categoryId.value = targetCategoryId
      archiveRecordId.value = result.archiveRecordId ?? ''
      void message.success(
        `重分类完成，复用 ${result.reusedFieldCount} 项，清空 ${result.clearedFieldCount} 项`,
      )
      await refreshStatus()
    } catch (error) {
      if (intakeRequestToken.value !== requestToken) {
        return
      }
      showUserError(error, '重分类失败')
    } finally {
      if (intakeRequestToken.value === requestToken) {
        reassigning.value = false
      }
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
    writePending,
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
    refreshStatus,
    startIntake,
    saveDraft,
    submitIntake,
    reassignCategory,
    restartRejectedCandidates,
    clearScanCommittedQuery,
    resetIntakeContext,
  }
}

export function buildPortfolioIntakeScanReturnTo(query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  return `/portfolio/teacher/intake?${params.toString()}`
}
