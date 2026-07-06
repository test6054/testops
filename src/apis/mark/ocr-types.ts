import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { MarkOcrHealthStatusCode } from '@/types/enums/mark-ocr-health-status-enum'
import {
  ALL_MARK_OCR_PROVIDER_TYPE_CODES,
  MarkOcrProviderTypeCode,
  MarkOcrProviderTypeDescription,
} from '@/types/enums/mark-ocr-provider-type-enum'

export {
  ALL_MARK_OCR_HEALTH_STATUS_CODES,
  MarkOcrHealthStatusCode,
  MarkOcrHealthStatusDescription,
} from '@/types/enums/mark-ocr-health-status-enum'

export {
  ALL_MARK_OCR_PROVIDER_TYPE_CODES,
  MarkOcrProviderTypeCode,
  MarkOcrProviderTypeDescription,
} from '@/types/enums/mark-ocr-provider-type-enum'

/** OCR 渠道下拉选项，值必须与后端 MarkOcrProviderType 完全一致 */
export const MARK_OCR_PROVIDER_OPTIONS: Array<{
  label: string
  value: MarkOcrProviderTypeCode
}> = ALL_MARK_OCR_PROVIDER_TYPE_CODES.map((value) => ({
  value,
  label: MarkOcrProviderTypeDescription[value],
}))

export const MARK_OCR_PROVIDER_DESCRIPTION: Record<MarkOcrProviderTypeCode, string> = {
  [MarkOcrProviderTypeCode.BAIDU]: '使用平台统一配置的百度 OCR 企业账号识别题目切片。',
  [MarkOcrProviderTypeCode.PADDLE]: '使用平台部署的 PaddleOCR HTTP 服务，图片不出域。',
}

/** 直接扫描整页切题能力说明，必须与 edu-mark 后端 provider 路由保持一致。 */
export const MARK_OCR_PAPER_CUT_CAPABILITY: Record<MarkOcrProviderTypeCode, string> = {
  [MarkOcrProviderTypeCode.BAIDU]:
    '支持直接扫描整页切题，使用百度 paper_cut_edu 生成题块候选；正式 ROI 由千问版面或 OCR 拆题器生成。',
  [MarkOcrProviderTypeCode.PADDLE]:
    '支持直接扫描整页切题，要求本地 PaddleOCR 服务暴露 /paper-cut 并返回真实题块 ROI。',
}

export const MARK_OCR_HEALTH_STATUS_TONE: Record<MarkOcrHealthStatusCode, BadgeTone> = {
  [MarkOcrHealthStatusCode.UNKNOWN]: 'gray',
  [MarkOcrHealthStatusCode.HEALTHY]: 'green',
  [MarkOcrHealthStatusCode.FAILED]: 'red',
}
