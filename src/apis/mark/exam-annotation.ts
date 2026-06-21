/**
 * 阅卷考试批注 API - 对接 /api/mark/exams/annotations。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'

const ANNOTATION_DATA_ERROR = '批注数据异常，请刷新后重试'

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryRequest extends QueryDto {
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  gradeResultId?: string
}

/** 批注范围 - 与后端 AnnotationScope 枚举一致 */
export type AnnotationScopeCode = 'QUESTION' | 'PAGE'

/** 批注响应 - 对应 AnnotationResponse */
export interface AnnotationVO {
  annotationId: string
  examId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  pageId?: string
  gradeResultId?: string
  annotationScope?: AnnotationScopeCode
  annotationText?: string
  correlationId?: string
  createTime?: string
}

const ANNOTATION_SCOPE_LABEL: Record<AnnotationScopeCode, string> = {
  QUESTION: '题目',
  PAGE: '页面',
}

/** 批注记录契约校验。 */
export function validateAnnotationContract(record: AnnotationVO): void {
  assertUserFacingText(record.annotationId, ANNOTATION_DATA_ERROR)
  if (record.annotationScope) {
    strictEnumLabel(ANNOTATION_SCOPE_LABEL, record.annotationScope, '批注范围')
  }
}

/** 查询批注记录。 */
export function listAnnotations(
  request: AnnotationQueryRequest,
): Promise<PageResult<AnnotationVO>> {
  return http.post<PageResult<AnnotationVO>>('/api/mark/exams/annotations', request)
}
