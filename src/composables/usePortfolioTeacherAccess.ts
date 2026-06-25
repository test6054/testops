import { computed } from 'vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { hasTeacherTenantPermission, RoleEnum } from '@/utils/permission'

/**
 * 教学档案袋教师访问范围：与后端 PortfolioOrgAccessService 对齐。
 */
export function usePortfolioTeacherAccess() {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  const currentUserId = computed(() => userStore.userInfo.userId || '')

  /** 租户管理员 / 超管可为他人办理档案袋 AI 任务 */
  const canPickTeachers = computed(() => hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }))

  /** 是否可进入档案审核台：超管、租户管理员、院系负责人 */
  const canReviewPortfolio = computed(() => {
    if (authStore.userRole === RoleEnum.SUPER_ADMIN) {
      return true
    }
    if (canPickTeachers.value) {
      return true
    }
    return authStore.userRole === RoleEnum.CROP_ADMIN
  })

  /**
   * 是否可为指定教师操作档案袋 AI：本人、超管、租户管理员、同院系院系负责人。
   * fromScopedRoster：目标教师已出现在当前院系过滤后的名册/选项中（CROP_ADMIN 必填）。
   */
  function canManageTeacherAi(teacherUserId: string, fromScopedRoster = false): boolean {
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
    if (authStore.userRole === RoleEnum.CROP_ADMIN) {
      return fromScopedRoster
    }
    return false
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
