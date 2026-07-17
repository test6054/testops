import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  claimScanDispatch,
  openScanDispatch,
  previewScanDispatch,
  resumeScanDispatch,
  suspendScanDispatch,
} from '@/apis/mark/scanner-dispatch'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { getUserErrorMessage } from '@/utils/error-handler'
import { useDocumentKioskBootstrap } from '../composables/useDocumentKioskBootstrap'
import { useCognitiveConfirm } from './useCognitiveConfirm'
import { useLeaseHeartbeat } from './useLeaseHeartbeat'

export function useDispatchSession() {
  const route = useRoute()
  const router = useRouter()
  const bootstrap = useDocumentKioskBootstrap()
  const cognitive = useCognitiveConfirm()
  const lease = useLeaseHeartbeat()

  const ticket = ref<ScanDispatchTicketVO | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const actionLoading = ref(false)

  const ticketId = computed(() => String(route.params.ticketId ?? ''))
  const isPreviewMode = computed(() => route.query.mode === 'preview')
  const returnTo = computed(() => String(route.query.returnTo ?? ''))

  const scannerDeviceId = computed(() => bootstrap.setup.value?.scannerDeviceId ?? '')
  const scannerStationId = computed(() => bootstrap.setup.value?.scannerStationId ?? '')

  const canClaimTicket = computed(() => {
    if (ticket.value?.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT) {
      const snapshot = ticket.value.portfolioSnapshot
      return Boolean(snapshot?.teacherId && snapshot.collectMode)
    }
    const snapshot = ticket.value?.archiveSnapshot
    if (!snapshot) {
      return false
    }
    return Boolean(snapshot.physicalStorageLocation?.trim() && snapshot.materialType)
  })

  function handleLeaseLost() {
    errorMessage.value = '派单租约已失效，任务可能已被释放，请返回队列重新领取'
    cognitive.clearConfirm()
  }

  function assertLeaseActive() {
    if (lease.leaseLost.value) {
      errorMessage.value = '派单租约已失效，请返回队列重新领取'
      return false
    }
    return true
  }

  function startProcessingHeartbeat() {
    if (!ticketId.value || !scannerDeviceId.value || !scannerStationId.value) {
      return
    }
    lease.startHeartbeat(
      ticketId.value,
      scannerDeviceId.value,
      scannerStationId.value,
      { onLeaseLost: handleLeaseLost },
    )
  }

  async function loadTicket() {
    if (!ticketId.value) {
      errorMessage.value = '缺少派单信息'
      return
    }
    loading.value = true
    errorMessage.value = ''
    try {
      ticket.value = await previewScanDispatch({ ticketId: ticketId.value })
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
      ticket.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function claimTicket() {
    if (actionLoading.value) {
      return false
    }
    if (!assertLeaseActive()) {
      return false
    }
    if (!ticketId.value || !scannerDeviceId.value || !scannerStationId.value) {
      errorMessage.value = '请先完成一体机设备激活后再领取派单'
      return false
    }
    actionLoading.value = true
    try {
      ticket.value = await claimScanDispatch({
        ticketId: ticketId.value,
        scannerDeviceId: scannerDeviceId.value,
        scannerStationId: scannerStationId.value,
      })
      startProcessingHeartbeat()
      cognitive.requestConfirm(ticket.value)
      return true
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
      return false
    }
    finally {
      actionLoading.value = false
    }
  }

  async function confirmOpen() {
    if (actionLoading.value) {
      return false
    }
    if (!assertLeaseActive()) {
      return false
    }
    if (!ticketId.value || !scannerDeviceId.value || !scannerStationId.value) {
      errorMessage.value = '请先完成一体机设备激活后再确认进纸'
      return false
    }
    actionLoading.value = true
    try {
      ticket.value = await openScanDispatch({
        ticketId: ticketId.value,
        scannerDeviceId: scannerDeviceId.value,
        scannerStationId: scannerStationId.value,
      })
      cognitive.clearConfirm()
      if (ticket.value.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT) {
        const snapshot = ticket.value.portfolioSnapshot
        await router.replace({
          path: '/scanner-kiosk/portfolio/session',
          query: {
            collectMode: snapshot?.collectMode,
            teacherId: snapshot?.teacherId,
            gapTaskId: snapshot?.gapTaskId,
            categoryId: snapshot?.categoryId,
            taskType: snapshot?.taskType,
            templateCode: snapshot?.templateCode,
            archiveRecordId: snapshot?.archiveRecordId,
            dispatchTicketId: ticketId.value,
            ...(returnTo.value ? { returnTo: returnTo.value } : {}),
          },
        })
        return true
      }
      await router.replace({
        path: '/scanner-kiosk/archive/session',
        query: {
          volumeId: ticket.value.archiveSnapshot?.volumeId,
          catalogCode: ticket.value.archiveSnapshot?.catalogCode,
          materialType: ticket.value.archiveSnapshot?.materialType,
          batchMode: ticket.value.archiveSnapshot?.archiveBatchMode,
          dispatchTicketId: ticketId.value,
          ...(returnTo.value ? { returnTo: returnTo.value } : {}),
        },
      })
      return true
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
      return false
    }
    finally {
      actionLoading.value = false
    }
  }

  async function suspendTicket() {
    if (actionLoading.value) {
      return false
    }
    if (!assertLeaseActive()) {
      return
    }
    if (!ticketId.value || !scannerDeviceId.value || !scannerStationId.value) {
      return
    }
    actionLoading.value = true
    try {
      ticket.value = await suspendScanDispatch({
        ticketId: ticketId.value,
        scannerDeviceId: scannerDeviceId.value,
        scannerStationId: scannerStationId.value,
      })
      lease.stopHeartbeat()
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
    }
    finally {
      actionLoading.value = false
    }
  }

  async function continueScanSession() {
    if (!assertLeaseActive()) {
      return false
    }
    if (!ticketId.value) {
      return false
    }
    if (ticket.value?.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT) {
      const snapshot = ticket.value.portfolioSnapshot
      if (!snapshot?.teacherId) {
        return false
      }
      await router.push({
        path: '/scanner-kiosk/portfolio/session',
        query: {
          collectMode: snapshot.collectMode,
          teacherId: snapshot.teacherId,
          gapTaskId: snapshot.gapTaskId,
          categoryId: snapshot.categoryId,
          taskType: snapshot.taskType,
          templateCode: snapshot.templateCode,
          archiveRecordId: snapshot.archiveRecordId,
          dispatchTicketId: ticketId.value,
          ...(returnTo.value ? { returnTo: returnTo.value } : {}),
        },
      })
      return true
    }
    const snapshot = ticket.value?.archiveSnapshot
    if (!snapshot?.volumeId || !ticketId.value) {
      return false
    }
    await router.push({
      path: '/scanner-kiosk/archive/session',
      query: {
        volumeId: snapshot.volumeId,
        catalogCode: snapshot.catalogCode,
        materialType: snapshot.materialType,
        batchMode: snapshot.archiveBatchMode,
        dispatchTicketId: ticketId.value,
        ...(returnTo.value ? { returnTo: returnTo.value } : {}),
      },
    })
    return true
  }

  async function resumeTicket() {
    if (actionLoading.value) {
      return false
    }
    if (!assertLeaseActive()) {
      return
    }
    if (!ticketId.value || !scannerDeviceId.value || !scannerStationId.value) {
      return
    }
    actionLoading.value = true
    try {
      ticket.value = await resumeScanDispatch({
        ticketId: ticketId.value,
        scannerDeviceId: scannerDeviceId.value,
        scannerStationId: scannerStationId.value,
      })
      startProcessingHeartbeat()
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
    }
    finally {
      actionLoading.value = false
    }
  }

  return {
    ticket,
    loading,
    errorMessage,
    actionLoading,
    ticketId,
    isPreviewMode,
    scannerDeviceId,
    scannerStationId,
    canClaimTicket,
    bootstrap,
    cognitive,
    lease,
    loadTicket,
    claimTicket,
    confirmOpen,
    suspendTicket,
    resumeTicket,
    continueScanSession,
    startProcessingHeartbeat,
  }
}
