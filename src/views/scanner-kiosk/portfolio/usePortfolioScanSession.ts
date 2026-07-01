import type {
  PortfolioCollectModeCode,
  ScanWorkOrderLifecycleVO,
  ScanWorkOrderPortfolioContextVO,
} from '@/apis/mark/scanner-work-order'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getAgentSetupContext } from '@/apis/mark/scanner-agent-local'
import {
  getScanWorkOrderContext,
  startScanWorkOrder,
} from '@/apis/mark/scanner-work-order'
import { showUserError } from '@/utils/error-handler'

export function usePortfolioScanSession() {
  const route = useRoute()
  const loading = ref(false)
  const lifecycle = ref<ScanWorkOrderLifecycleVO | null>(null)
  const portfolioContext = ref<ScanWorkOrderPortfolioContextVO | null>(null)

  const collectMode = computed<PortfolioCollectModeCode | undefined>(() => {
    const raw = String(route.query.collectMode ?? '')
    if (raw === 'AI_SUBMIT' || raw === 'GAP_ATTACHMENT') {
      return raw
    }
    return undefined
  })
  const teacherId = computed(() => String(route.query.teacherId ?? ''))
  const taskType = computed(() => String(route.query.taskType ?? ''))
  const templateCode = computed(() => String(route.query.templateCode ?? ''))
  const categoryId = computed(() => String(route.query.categoryId ?? ''))
  const archiveRecordId = computed(() => String(route.query.archiveRecordId ?? ''))
  const gapTaskId = computed(() => String(route.query.gapTaskId ?? ''))
  const dispatchTicketId = computed(() => String(route.query.dispatchTicketId ?? ''))
  const returnTo = computed(() => String(route.query.returnTo ?? ''))

  const collectModeLabel = computed(() =>
    collectMode.value === 'GAP_ATTACHMENT' ? '补采附件' : 'AI 候选提交',
  )

  async function loadContext() {
    if (!dispatchTicketId.value) {
      throw new Error('缺少派单 ticketId，请从 Hub 或派单页进入')
    }
    if (!collectMode.value || !teacherId.value) {
      throw new Error('缺少 collectMode 或 teacherId')
    }
    loading.value = true
    try {
      const setup = await getAgentSetupContext()
      if (!setup.bound || !setup.scannerDeviceId || !setup.scannerStationId) {
        portfolioContext.value = {
          scanAllowed: false,
          blockReason: '请先激活扫描 Agent',
        }
        return
      }
      const context = await getScanWorkOrderContext({
        taskKind: 'PORTFOLIO_COLLECT',
        scannerDeviceId: setup.scannerDeviceId,
        scannerStationId: setup.scannerStationId,
        collectMode: collectMode.value,
        teacherId: teacherId.value,
        gapTaskId: gapTaskId.value || undefined,
        categoryId: categoryId.value || undefined,
        taskType: taskType.value || undefined,
        templateCode: templateCode.value || undefined,
        archiveRecordId: archiveRecordId.value || undefined,
        batchExternalNo: lifecycle.value?.batchExternalNo,
      })
      portfolioContext.value = context.portfolioContext ?? null
      const batchNo = context.activeBatchExternalNo ?? context.portfolioContext?.activeBatchExternalNo
      const status = context.activeWorkOrderStatus ?? context.portfolioContext?.activeWorkOrderStatus
      if (batchNo && (status === 'COMMITTING' || status === 'FAILED' || status === 'IN_PROGRESS')) {
        lifecycle.value = {
          workOrderId: context.activeWorkOrderId ?? context.portfolioContext?.activeWorkOrderId,
          batchExternalNo: batchNo,
          status,
          taskKind: 'PORTFOLIO_COLLECT',
          diagnostic: context.portfolioContext?.activeWorkOrderDiagnostic,
        }
      }
    }
    catch (error) {
      showUserError(error, '加载档案袋扫描上下文失败')
      throw error
    }
    finally {
      loading.value = false
    }
  }

  async function startSession() {
    if (!dispatchTicketId.value) {
      throw new Error('缺少派单 ticketId，请从 Hub 或派单页进入')
    }
    if (!collectMode.value || !teacherId.value) {
      throw new Error('缺少采集模式或教师 ID')
    }
    if (portfolioContext.value?.scanAllowed !== true) {
      throw new Error(portfolioContext.value?.blockReason || '当前不允许档案袋扫描')
    }
    loading.value = true
    try {
      const setup = await getAgentSetupContext()
      lifecycle.value = await startScanWorkOrder({
        taskKind: 'PORTFOLIO_COLLECT',
        collectMode: collectMode.value,
        teacherId: teacherId.value,
        gapTaskId: gapTaskId.value || undefined,
        categoryId: categoryId.value || undefined,
        taskType: taskType.value || undefined,
        templateCode: templateCode.value || undefined,
        archiveRecordId: archiveRecordId.value || undefined,
        dispatchTicketId: dispatchTicketId.value,
        scannerDeviceId: setup.scannerDeviceId!,
        scannerStationId: setup.scannerStationId!,
        scanConfig: {
          dpi: 300,
          colorMode: 'COLOR',
          duplexMode: 'SIMPLEX',
          blankPageDetectionEnabled: true,
        },
      })
      await loadContext()
      return lifecycle.value
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    lifecycle,
    portfolioContext,
    collectMode,
    collectModeLabel,
    teacherId,
    taskType,
    templateCode,
    categoryId,
    archiveRecordId,
    gapTaskId,
    dispatchTicketId,
    returnTo,
    loadContext,
    startSession,
    buildIntakeReturnTo: buildPortfolioIntakeScanReturnTo,
  }
}

/** 构建材料采集页扫描回跳 URL（携带 scanCommitted 由扫描会话追加） */
export function buildPortfolioIntakeScanReturnTo(query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  return `/portfolio/teacher/intake?${params.toString()}`
}
