import type {
  ExamScannerBatchPageInspectorRequest,
  ExamScannerBatchPageInspectorVO,
  ExamScannerBatchWorkbenchPageVO,
  ExamScannerBatchWorkbenchRequest,
  ExamScannerBatchWorkbenchResponse,
  ScannerBatchWorkbenchPageQueryRequest,
  ScannerBatchWorkbenchPageQueryResponse,
} from '@/apis/mark/exam-scan'
import { PageRegisterStateCode } from '@/types/enums/page-register-state-enum'
import { ScanBatchStatusCode } from '@/types/enums/scan-batch-status-enum'
import { ScanBatchWorkbenchBindingStatusCode } from '@/types/enums/scan-batch-workbench-binding-status-enum'
import { ScanBatchWorkbenchRegisterStatusCode } from '@/types/enums/scan-batch-workbench-register-status-enum'
import { ScanBatchWorkbenchTopActionCode } from '@/types/enums/scan-batch-workbench-top-action-enum'

const MOCK_SOURCE_COUNT = 10

function buildPendingRows(): ExamScannerBatchWorkbenchPageVO[] {
  return Array.from({ length: MOCK_SOURCE_COUNT }, (_, index) => {
    const fileOrder = index + 1
    return {
      pageKey: `pending-${fileOrder}`,
      registerStatus: ScanBatchWorkbenchRegisterStatusCode.PENDING,
      bindingStatus: ScanBatchWorkbenchBindingStatusCode.UNBOUND,
      hasException: false,
      fileOrder,
      fileId: `mock-file-${fileOrder}`,
      fileName: `scan-page-${fileOrder}.jpg`,
      attentionCount: 0,
    }
  })
}

function buildWorkbenchResponse(
  request: ExamScannerBatchWorkbenchRequest,
): ExamScannerBatchWorkbenchResponse {
  const items = buildPendingRows()
  return {
    batch: {
      scanBatchId: request.scanBatchId,
      examId: request.examId,
      batchNo: `MOCK-${request.scanBatchId}`,
      sourceFiles: [],
      sourceFileCount: MOCK_SOURCE_COUNT,
      pageCount: MOCK_SOURCE_COUNT,
      receivedPageCount: 0,
      pendingUploadCount: MOCK_SOURCE_COUNT,
      attentionItemCount: 0,
      status: ScanBatchStatusCode.BLOCKED,
      statusMessage: '页登记被阻断',
      diagnostic: '扫描批次已收件，自动页登记被阻断：考试模板页数未配置，不能自动登记扫描页',
      scanStartTime: '2026-07-09T15:47:24',
      scanEndTime: '2026-07-09T15:48:10',
      eventCount: 1,
      replaceTargetPage: false,
      boundPaperCount: 0,
      pageRegisterState: PageRegisterStateCode.BLOCKED_RECOVERABLE,
    },
    signalBandMessage: '已收件 10 份原件 · 已登记 0 页 · 页登记被阻断：模板页数未配置',
    signalBandTone: 'error',
    progressPercent: 0,
    sourceReceivedCount: MOCK_SOURCE_COUNT,
    pageRegisteredCount: 0,
    paperBoundCount: 0,
    topActions: [ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER],
    initialPageKey: items[0]?.pageKey,
    initialPageItems: items,
  }
}

export function mockGetScannerBatchWorkbench(
  request: ExamScannerBatchWorkbenchRequest,
): Promise<ExamScannerBatchWorkbenchResponse> {
  return Promise.resolve(buildWorkbenchResponse(request))
}

export function mockPageScannerBatchWorkbenchPages(
  request: ScannerBatchWorkbenchPageQueryRequest,
): Promise<ScannerBatchWorkbenchPageQueryResponse> {
  const allItems = buildPendingRows()
  const pageSize = request.pageSize ?? 50
  const start = request.cursor ? Number.parseInt(request.cursor, 10) || pageSize : 0
  const items = allItems.slice(start, start + pageSize)
  const nextStart = start + items.length
  return Promise.resolve({
    items,
    nextCursor: nextStart < allItems.length ? String(nextStart) : null,
    totalCount: allItems.length,
    pendingCount: allItems.length,
    registeredCount: 0,
    exceptionCount: 0,
  })
}

export function mockGetScannerBatchPageInspector(
  request: ExamScannerBatchPageInspectorRequest,
): Promise<ExamScannerBatchPageInspectorVO> {
  const page =
    buildPendingRows().find((item) => item.pageKey === request.pageKey) ?? buildPendingRows()[0]
  return Promise.resolve({
    page,
    inspectorHint: '原件待登记，OCR 将在登记后自动触发',
  })
}
