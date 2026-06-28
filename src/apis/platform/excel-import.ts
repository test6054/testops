import type {
  ExcelImportGetRequest,
  ExcelImportResult,
  ExcelImportSubmitRequest,
  ExcelImportTemplateRequest,
  ExcelImportTemplateVO,
} from './types'
import http from '@/config/axios'
import { resolveExcelImportApiBase } from './scene-keys'

export function downloadExcelImportTemplate(
  request: ExcelImportTemplateRequest,
): Promise<ExcelImportTemplateVO> {
  const base = resolveExcelImportApiBase(request.sceneKey)
  return http.post<ExcelImportTemplateVO>(`${base}/template`, request)
}

export function submitExcelImport(request: ExcelImportSubmitRequest): Promise<ExcelImportResult> {
  const base = resolveExcelImportApiBase(request.sceneKey)
  return http.post<ExcelImportResult>(`${base}/submit`, request)
}

export function getExcelImportBatch(request: ExcelImportGetRequest): Promise<ExcelImportResult> {
  const base = resolveExcelImportApiBase(request.sceneKey)
  return http.post<ExcelImportResult>(`${base}/get`, request)
}
