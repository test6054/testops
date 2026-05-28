import type { CandidateDraft } from './types'
import type { UserDto } from '@/types/api-types.d'
import { getStudentsByClass } from '@/apis/edu/class'

function mapUserToDraft(user: UserDto): CandidateDraft | null {
  const studentUserId = String(user.id ?? '').trim()
  const studentNo = String(user.studentNumber ?? user.stuId ?? '').trim()
  const studentName = String(user.nickName ?? '').trim()
  const classId = String(user.classId ?? '').trim()
  if (!studentUserId || !studentNo || !studentName) {
    return null
  }
  return {
    studentUserId,
    studentNo,
    studentName,
    classId,
    className: user.className?.trim() || undefined,
  }
}

/** 从已配置的班级范围分页拉取租户学生，纳入考试考生名册。 */
export async function loadStudentDraftsFromClasses(classIds: string[]): Promise<CandidateDraft[]> {
  if (!classIds.length) {
    return []
  }
  const byUserId = new Map<string, CandidateDraft>()
  for (const classId of classIds) {
    let pageNum = 1
    let pages = 1
    while (pageNum <= pages) {
      const page = await getStudentsByClass({
        classId,
        pageNum,
        pageSize: 200,
      })
      pages = page.pages ?? 1
      for (const user of page.list ?? []) {
        const draft = mapUserToDraft(user)
        if (draft) {
          byUserId.set(draft.studentUserId, draft)
        }
      }
      pageNum += 1
    }
  }
  return [...byUserId.values()]
}
