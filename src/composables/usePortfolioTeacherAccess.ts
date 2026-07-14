import { computed } from 'vue'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { hasTeacherTenantPermission, RoleEnum } from '@/utils/permission'

/**
 * 教学档案袋教师访问范围：与后端 PortfolioOrgAccessService 对齐。
 */
export function usePortfolioTeacherAccess() {
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const { accessScope } = usePortfolioReviewAccess()

  const currentUserId = computed(() => userStore.userInfo.userId || '')

  /** 租户管理员 / 超管可为他人办理档案袋（全校选人） */
  const canPickTeachers = computed(() => hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }))

  /** 是否可进入档案审核台：以服务端 access-scope.reviewAccess 为准 */
  const canReviewPortfolio = computed(() => {
    if (authStore.userRole === RoleEnum.SUPER_ADMIN) {
      return true
    }
    if (accessScope.value?.reviewAccess === true) {
      return true
    }
    return canPickTeachers.value
  })

  /**
   * 是否可为指定教师操作档案袋 AI：本人、超管、租户管理员、受管教研室负责人。
   * 院系/教研室范围由后端 assertOperatorCanManageTeacher 再裁剪。
   */
  function canManageTeacherAi(teacherUserId: string): boolean {
    if (!teacherUserId) {
      return false
    }
    if (teacherUserId === currentUserId.value) {
      return true
    }
    if (authStore.userRole === RoleEnum.SUPER_ADMIN) {
      return true
    }
    if (canPickTeachers.value) {
      return true
    }
    return accessScope.value?.teachingGroupLeader === true
  }

  /** 普通教师默认锁定本人；租户管理员需显式选择目标教师 */
  function resolveDefaultTeacherId(): string {
    if (canPickTeachers.value) {
      return ''
    }
    return currentUserId.value
  }

  return {
    currentUserId,
    canPickTeachers,
    canReviewPortfolio,
    canManageTeacherAi,
    resolveDefaultTeacherId,
  }
}
