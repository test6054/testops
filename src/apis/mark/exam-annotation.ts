/**
 * 阅卷考试批注 API - 对接 /api/mark/exams/annotations。
 */
import type { PageResult, QueryDto } from '@/types'
import type { AnnotationScopeCode } from '@/types/enums/annotation-scope-enum'
import http from '@/config/axios'

export {
  ALL_ANNOTATION_SCOPE_CODES,
  AnnotationScopeCode,
  AnnotationScopeDescription,
} from '@/types/enums/annotation-scope-enum'

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryRequest extends QueryDto {
  examId: string
  paperInstanceId?: string
  layoutQuestionId?: string
  gradeResultId?: string
}

/** 批注响应 - 对应 AnnotationResponse */
export interface AnnotationVO {
  annotationId: string
  examId?: string
  paperInstanceId?: string
  layoutQuestionId?: string
  pageId?: string
  gradeResultId?: string
  annotationScope?: AnnotationScopeCode
  annotationText?: string
  correlationId?: string
  createTime?: string
}

/** 查询批注记录。 */
export function listAnnotations(
  request: AnnotationQueryRequest,
): Promise<PageResult<AnnotationVO>> {
  return http.post<PageResult<AnnotationVO>>('/api/mark/exams/annotations', request)
}
