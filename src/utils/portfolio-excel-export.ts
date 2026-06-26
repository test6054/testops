import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type { PortfolioIndicatorExportResultVO } from '@/apis/portfolio/indicator-types'
import { handleDownloadFile } from '@/utils/file-download'

export type PortfolioExcelDownloadPayload = Pick<
  PortfolioArchiveBagExportResultVO,
  'fileName' | 'fileNodeId'
>

export type PortfolioIndicatorExcelDownloadPayload = Pick<
  PortfolioIndicatorExportResultVO,
  'fileName' | 'fileNodeId'
>

/** 下载 portfolio 域 Excel 导出结果（edu-storage fileNodeId） */
export async function downloadPortfolioExcelExport(result: PortfolioExcelDownloadPayload) {
  if (!result.fileNodeId) {
    throw new Error('导出结果缺少 fileNodeId')
  }
  await handleDownloadFile({
    fileId: result.fileNodeId,
    fileName: result.fileName,
  })
}

/** 下载指标域 Excel 导出结果 */
export async function downloadPortfolioIndicatorExcelExport(result: PortfolioIndicatorExcelDownloadPayload) {
  if (!result.fileNodeId) {
    throw new Error('导出结果缺少 fileNodeId')
  }
  await handleDownloadFile({
    fileId: result.fileNodeId,
    fileName: result.fileName,
  })
}
