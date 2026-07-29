/**
 * 阅卷考试批注 API - 对接 /api/mark/exams/annotations。
 */
import type { PageResult, QueryDto } from '@/types'
import type { AnnotationScopeCode } from '@/types/enums/annotation-scope-enum'
import http from '@/config/axios'
import { ALL_ANNOTATION_SCOPE_CODES } from '@/types/enums/annotation-scope-enum'

export {
  ALL_ANNOTATION_SCOPE_CODES,
  AnnotationScopeCode,
  AnnotationScopeDescription,
} from '@/types/enums/annotation-scope-enum'

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryRequest extends QueryDto {
  examId: string
  paperInstanceId?: string
  taskId?: string
  layoutQuestionId?: string
  gradeResultId?: string
}

/** 批注响应 - 对应 AnnotationResponse */
export interface AnnotationResponse {
  annotationId: string
  examId?: string
  paperInstanceId?: string
  taskId?: string
  layoutQuestionId?: string
  pageId?: string
  gradeResultId?: string
  annotationScope?: AnnotationScopeCode
  annotationText?: string
  correlationId?: string
  createTime?: string
}

/** 查询批注记录，并校验分页、考试范围与批注审计锚点。 */
export async function listAnnotations(
  request: AnnotationQueryRequest,
): Promise<PageResult<AnnotationResponse>> {
  const response = await http.post<PageResult<AnnotationResponse>>('/api/mark/exams/annotations', request)
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || !Number.isInteger(response.pageNum)
    || response.pageNum < 1
    || !Number.isInteger(response.pageSize)
    || response.pageSize < 1
    || !Number.isInteger(response.pages)
    || response.pages < 0
    || response.list.length > response.pageSize
    || response.list.length > response.total
  ) {
    throw new TypeError('批注分页合同异常：分页字段或批注集合不可用')
  }
  const annotationIds = new Set<string>()
  for (const item of response.list) {
    if (
      !item.annotationId
      || annotationIds.has(item.annotationId)
      || item.examId !== request.examId
      || (request.paperInstanceId && item.paperInstanceId !== request.paperInstanceId)
      || (request.taskId && item.taskId !== request.taskId)
      || (request.layoutQuestionId && item.layoutQuestionId !== request.layoutQuestionId)
      || (request.gradeResultId && item.gradeResultId !== request.gradeResultId)
      || (item.annotationScope != null
        && !ALL_ANNOTATION_SCOPE_CODES.includes(item.annotationScope))
      || !item.createTime?.trim()
    ) {
      throw new TypeError('批注合同异常：批注身份、业务范围或审计时间不可用')
    }
    annotationIds.add(item.annotationId)
  }
  return response
}
