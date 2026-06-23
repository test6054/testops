import type { RouteLocationRaw } from 'vue-router'

/** 阅卷组织列表：有 examId 时留在考试工作台内 */
export function resolveMarkingOrganizationIndexRoute(examId?: string): RouteLocationRaw {
  if (examId) {
    return { name: 'TeacherExamWorkspaceMarkingOrg', params: { examId } }
  }
  return { name: 'TeacherMarkingOrganizationIndex' }
}

/** 阅卷组织详情：有 examId 时留在考试工作台 layout 内 */
export function resolveMarkingOrganizationDetailRoute(
  organizationId: string,
  examId?: string,
): RouteLocationRaw {
  if (examId) {
    return {
      name: 'TeacherExamWorkspaceMarkingOrgDetail',
      params: { examId, organizationId },
    }
  }
  return { name: 'TeacherMarkingOrganizationDetail', params: { organizationId } }
}

/** 试评 / 正评会话页：有 examId 时留在考试工作台 layout 内 */
export function resolveMarkingOrganizationSessionsRoute(
  organizationId: string,
  examId?: string,
): RouteLocationRaw {
  if (examId) {
    return {
      name: 'TeacherExamWorkspaceMarkingOrgSessions',
      params: { examId, organizationId },
    }
  }
  return { name: 'TeacherMarkingOrganizationSessions', params: { organizationId } }
}
