import type {
  PortfolioCollectModeCode,
  ScanWorkOrderLifecycleVO,
  ScanWorkOrderPortfolioContextVO,
} from '@/apis/mark/scanner-work-order'
import { getScanWorkOrderContext, startScanWorkOrder } from '@/apis/mark/scanner-work-order'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ScannerColorModeCode, ScannerDuplexModeCode } from '@/apis/mark/exam-mark-scanner'
import { getAgentSetupContext } from '@/apis/mark/scanner-agent-local'
import { buildPortfolioIntakeScanReturnTo } from '@/composables/usePortfolioIntake'
import {
  ALL_PORTFOLIO_COLLECT_MODE_CODES,
  PortfolioCollectModeDescription,
} from '@/types/enums/portfolio-collect-mode-enum'
import {
  ALL_PORTFOLIO_AI_TASK_TYPE_CODES,
  type PortfolioAiTaskTypeCode,
} from '@/types/enums/portfolio-ai-task-type-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { mergeWorkOrderLifecycleFromContext } from '../composables/mergeWorkOrderLifecycleFromContext'

export function usePortfolioScanSession() {
  const route = useRoute()
  const loading = ref(false)
  const lifecycle = ref<ScanWorkOrderLifecycleVO | null>(null)
  const portfolioContext = ref<ScanWorkOrderPortfolioContextVO | null>(null)

  const collectMode = computed<PortfolioCollectModeCode | undefined>(() =>
    ALL_PORTFOLIO_COLLECT_MODE_CODES.find((code) => code === route.query.collectMode),
  )
  const teacherId = computed(() => String(route.query.teacherId ?? ''))
  const taskType = computed<PortfolioAiTaskTypeCode | undefined>(() =>
    ALL_PORTFOLIO_AI_TASK_TYPE_CODES.find((code) => code === route.query.taskType),
  )
  const templateCode = computed(() => String(route.query.templateCode ?? ''))
  const categoryId = computed(() => String(route.query.categoryId ?? ''))
  const archiveRecordId = computed(() => String(route.query.archiveRecordId ?? ''))
  const gapTaskId = computed(() => String(route.query.gapTaskId ?? ''))
  const dispatchTicketId = computed(() => String(route.query.dispatchTicketId ?? ''))
  const returnTo = computed(() => String(route.query.returnTo ?? ''))

  const collectModeLabel = computed(() => {
    if (!collectMode.value) {
      return '—'
    }
    return strictEnumLabel(PortfolioCollectModeDescription, collectMode.value, '档案袋采集模式')
  })

  async function loadContext(options?: { silent?: boolean }) {
    if (!dispatchTicketId.value) {
      showUserError(null, '缺少派单信息，请从扫描台首页或派单页进入')
      return
    }
    if (!collectMode.value || !teacherId.value) {
      showUserError(null, '缺少采集模式或教师编号')
      return
    }
    if (!options?.silent) {
      loading.value = true
    }
    try {
      const setup = await getAgentSetupContext()
      if (!setup.bound || !setup.scannerDeviceId || !setup.scannerStationId) {
        portfolioContext.value = {
          scanAllowed: false,
          blockReason: '请先激活本机扫描服务',
        }
        return
      }
      const context = await getScanWorkOrderContext({
        taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
        scannerDeviceId: setup.scannerDeviceId,
        scannerStationId: setup.scannerStationId,
        collectMode: collectMode.value,
        teacherId: teacherId.value,
        gapTaskId: gapTaskId.value || undefined,
        categoryId: categoryId.value || undefined,
        taskType: taskType.value,
        templateCode: templateCode.value || undefined,
        archiveRecordId: archiveRecordId.value || undefined,
        dispatchTicketId: dispatchTicketId.value,
        batchExternalNo: lifecycle.value?.batchExternalNo,
      })
      portfolioContext.value = context.portfolioContext ?? null
      lifecycle.value = mergeWorkOrderLifecycleFromContext(
        context,
        ScanTaskKindCode.PORTFOLIO_COLLECT,
        lifecycle.value,
      )
    } catch (error) {
      if (!options?.silent) {
        showUserError(error, '加载档案袋扫描上下文失败')
      }
    } finally {
      if (!options?.silent) {
        loading.value = false
      }
    }
  }

  async function startSession() {
    if (!dispatchTicketId.value) {
      showUserError(null, '缺少派单信息，请从扫描台首页或派单页进入')
      return null
    }
    if (!collectMode.value || !teacherId.value) {
      showUserError(null, '缺少采集模式或教师编号')
      return null
    }
    if (portfolioContext.value?.scanAllowed !== true) {
      showUserError(null, portfolioContext.value?.blockReason || '当前不允许档案袋扫描')
      return null
    }
    loading.value = true
    try {
      const setup = await getAgentSetupContext()
      if (!setup.bound || !setup.scannerDeviceId || !setup.scannerStationId) {
        showUserError(null, '扫描设备未绑定，请先激活一体机')
        return null
      }
      lifecycle.value = await startScanWorkOrder({
        taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
        collectMode: collectMode.value,
        teacherId: teacherId.value,
        gapTaskId: gapTaskId.value || undefined,
        categoryId: categoryId.value || undefined,
        taskType: taskType.value,
        templateCode: templateCode.value || undefined,
        archiveRecordId: archiveRecordId.value || undefined,
        dispatchTicketId: dispatchTicketId.value,
        scannerDeviceId: setup.scannerDeviceId,
        scannerStationId: setup.scannerStationId,
        scanConfig: {
          dpi: 300,
          colorMode: ScannerColorModeCode.COLOR,
          duplexMode: ScannerDuplexModeCode.SIMPLEX,
          blankPageDetectionEnabled: true,
        },
      })
      await loadContext()
      return lifecycle.value
    } catch (error) {
      showUserError(error, '档案袋扫描开单失败')
      return null
    } finally {
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
