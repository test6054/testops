import type { RouteLocationRaw } from 'vue-router'

/** 阅卷组织列表：有 examId 时留在考试工作台内 */
export function resolveMarkingOrganizationIndexRoute(examId?: string): RouteLocationRaw {
  if (examId) {
    return { name: 'TeacherExamWorkspaceMarkingOrg', params: { examId } }
  }
  return { name: 'TeacherExamList' }
}

/** 阅卷组织详情：仅考试工作台 layout 内入口 */
export function resolveMarkingOrganizationDetailRoute(
  organizationId: string,
  examId: string,
): RouteLocationRaw {
  return {
    name: 'TeacherExamWorkspaceMarkingOrgDetail',
    params: { examId, organizationId },
  }
}

/** 试评 / 正评会话页：仅考试工作台 layout 内入口 */
export function resolveMarkingOrganizationTrialSessionsRoute(
  organizationId: string,
  examId: string,
): RouteLocationRaw {
  return {
    name: 'TeacherExamWorkspaceMarkingOrgTrialSessions',
    params: { examId, organizationId },
  }
}

/** 正评会话页：仅考试工作台 layout 内入口 */
export function resolveMarkingOrganizationFormalSessionsRoute(
  organizationId: string,
  examId: string,
): RouteLocationRaw {
  return {
    name: 'TeacherExamWorkspaceMarkingOrgFormalSessions',
    params: { examId, organizationId },
  }
}

/** 试评 / 正评 hub：侧栏菜单无 organizationId 时先解析组织再跳转 */
export function resolveMarkingOrganizationTrialHubRoute(examId: string): RouteLocationRaw {
  return {
    name: 'TeacherExamWorkspaceMarkingOrgTrialHub',
    params: { examId },
  }
}

export function resolveMarkingOrganizationFormalHubRoute(examId: string): RouteLocationRaw {
  return {
    name: 'TeacherExamWorkspaceMarkingOrgFormalHub',
    params: { examId },
  }
}
