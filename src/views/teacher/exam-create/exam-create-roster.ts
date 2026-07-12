import type { ExamCandidateResponse, ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import { getUserErrorMessage, showFormValidationMessage } from '@/utils/error-handler'

/** 班级学生树抽屉勾选结果，与 ClassStudentTreeSelectorDrawer confirm 事件一致。 */
export interface ClassStudentDrawerSelectionInfo {
  id: string
  name: string
  classId?: string
  className?: string
  studentNumber?: string
}

/** 校验 preview API 返回的 ExamCandidateResponse 是否具备名册展示与提交所需字段。 */
export function requirePreviewCandidates(candidates: ExamCandidateResponse[]): ExamCandidateResponse[] | null {
  for (const candidate of candidates) {
    if (!candidate.classId) {
      showFormValidationMessage('名册预览返回缺少班级信息')
      return null
    }
  }
  return candidates
}

/** 合并 preview 返回的 ExamCandidateResponse，按 studentUserId 去重。 */
export function mergePreviewCandidates(
  existing: ExamCandidateResponse[],
  incoming: ExamCandidateResponse[],
): ExamCandidateResponse[] {
  const map = new Map<string, ExamCandidateResponse>()
  for (const candidate of existing) {
    map.set(candidate.studentUserId, candidate)
  }
  for (const candidate of incoming) {
    map.set(candidate.studentUserId, candidate)
  }
  return [...map.values()]
}

/** 将抽屉勾选学生转为 create-roster-preview 所需的 ExamCandidateRosterRequest；缺字段时返回 null。 */
export function buildRosterRequestsFromDrawerSelection(
  studentsInfo: ClassStudentDrawerSelectionInfo[],
): ExamCandidateRosterRequest[] | null {
  const requests: ExamCandidateRosterRequest[] = []
  for (const item of studentsInfo) {
    if (!item.classId || !item.name) {
      return null
    }
    requests.push({
      classId: item.classId,
      studentUserId: item.id,
    })
  }
  return requests
}

/** 名册预览接口返回的零学生班级业务错误，前端应走内联提示而非 toast。 */
export function isPreviewEmptyClassBusinessError(error: unknown): boolean {
  const message = getUserErrorMessage(error, '')
  return message.includes('没有可纳入的学生') || message.includes('暂无在籍学生')
}
