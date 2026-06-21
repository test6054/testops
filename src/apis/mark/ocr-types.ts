import type { BadgeTone } from '@/components/ui-guide/ui/types'

export type MarkOcrProviderTypeCode = 'TENCENT' | 'BAIDU' | 'PADDLE'

export type MarkOcrHealthStatusCode = 'UNKNOWN' | 'HEALTHY' | 'FAILED'

export const MARK_OCR_PROVIDER_LABEL: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '腾讯云 OCR',
  BAIDU: '百度 OCR',
  PADDLE: 'PaddleOCR 本地服务',
}

/** OCR 渠道下拉选项，值必须与后端 MarkOcrProviderType 完全一致 */
export const MARK_OCR_PROVIDER_OPTIONS: Array<{
  label: string
  value: MarkOcrProviderTypeCode
}> = [
  { value: 'TENCENT', label: MARK_OCR_PROVIDER_LABEL.TENCENT },
  { value: 'BAIDU', label: MARK_OCR_PROVIDER_LABEL.BAIDU },
  { value: 'PADDLE', label: MARK_OCR_PROVIDER_LABEL.PADDLE },
]

export const MARK_OCR_PROVIDER_DESCRIPTION: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '使用平台统一配置的腾讯云企业账号识别题目切片。',
  BAIDU: '使用平台统一配置的百度 OCR 企业账号识别题目切片。',
  PADDLE: '使用平台部署的 PaddleOCR HTTP 服务，图片不出域。',
}

/** 直接扫描整页切题能力说明，必须与 edu-mark 后端 provider 路由保持一致。 */
export const MARK_OCR_PAPER_CUT_CAPABILITY: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '不支持直接扫描整页切题；直接扫描批改必须切换到具备切题能力的渠道。',
  BAIDU: '支持直接扫描整页切题，使用百度 paper_cut_edu_vlm 异步接口生成题块候选，并由视觉精炼生成正式题目 ROI。',
  PADDLE: '支持直接扫描整页切题，要求本地 PaddleOCR 服务暴露 /paper-cut 并返回真实题块 ROI。',
}

export const MARK_OCR_HEALTH_STATUS_LABEL: Record<MarkOcrHealthStatusCode, string> = {
  UNKNOWN: '未检查',
  HEALTHY: '健康',
  FAILED: '异常',
}

export const MARK_OCR_HEALTH_STATUS_COLOR: Record<MarkOcrHealthStatusCode, BadgeTone> = {
  UNKNOWN: 'gray',
  HEALTHY: 'green',
  FAILED: 'red',
}
