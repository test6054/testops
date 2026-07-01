import type { ExcelImportSceneKeyValue } from '@/apis/platform/scene-keys'
import type { ExcelImportResult } from '@/apis/platform/types'
import { getExcelImportBatch, submitExcelImport } from '@/apis/platform/excel-import'

const ASYNC_POLL_INTERVAL_MS = 2000
const ASYNC_POLL_MAX_ATTEMPTS = 60

export interface SubmitPlatformExcelImportOptions {
  sceneKey: ExcelImportSceneKeyValue
  fileNodeId: string
  context?: Record<string, unknown>
  /** 异步 scene 提交后轮询 platform get，直至解析完成或失败 */
  pollAsync?: boolean
}

/** 提交平台 Excel 导入；异步 scene 可选轮询 get 直至终态。 */
export async function submitPlatformExcelImport(
  options: SubmitPlatformExcelImportOptions,
): Promise<ExcelImportResult> {
  const result = await submitExcelImport({
    sceneKey: options.sceneKey,
    fileNodeId: options.fileNodeId,
    context: options.context,
  })
  if (!options.pollAsync || result.executionMode !== 'ASYNC' || !result.batchId) {
    return result
  }
  return pollPlatformExcelImportBatch(options.sceneKey, result.batchId)
}

/** 轮询异步 Excel 导入批次直至解析完成。 */
export async function pollPlatformExcelImportBatch(
  sceneKey: ExcelImportSceneKeyValue,
  batchId: string,
): Promise<ExcelImportResult> {
  for (let attempt = 0; attempt < ASYNC_POLL_MAX_ATTEMPTS; attempt += 1) {
    const batch = await getExcelImportBatch({ sceneKey, batchId })
    const status = batch.asyncStatus ?? batch.batchStatus
    if (status === 'PREVIEW_READY' || status === 'VALIDATED' || status === 'CONFIRMED') {
      return batch
    }
    if (status === 'FAILED' || status === 'CANCELLED') {
      return batch
    }
    await sleep(ASYNC_POLL_INTERVAL_MS)
  }
  throw new Error('成绩导入解析超时，请稍后在批次列表中查看')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
