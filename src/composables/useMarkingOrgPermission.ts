import type { Ref } from 'vue'
import type { MarkingOrganizationVO } from '@/apis/mark/marking-organization'
import { computed } from 'vue'
import { useUserStore } from '@/stores/modules/user'

/**
 * 阅卷组织权限：与后端 ExamMarkPermissionService.canManageMarkingSetup / isExamOwner 对齐。
 */
export function useMarkingOrgPermission(
  examCreateUserId: Ref<string | undefined>,
  organization: Ref<MarkingOrganizationVO | null | undefined>,
) {
  const userStore = useUserStore()
  const currentUserId = computed(() => userStore.userInfo.userId)

  const canManageExamOwner = computed(() => {
    const org = organization.value
    if (org?.canManageExamOwner != null) {
      return org.canManageExamOwner
    }
    return !!examCreateUserId.value && examCreateUserId.value === currentUserId.value
  })

  const canManageMarkingSetup = computed(() => {
    const org = organization.value
    if (org?.canManageMarkingSetup != null) {
      return org.canManageMarkingSetup
    }
    if (canManageExamOwner.value) {
      return true
    }
    return !!org?.leaderUserId && org.leaderUserId === currentUserId.value
  })

  function guardMarkingSetupAction(actionLabel = '修改阅卷设置'): boolean {
    if (canManageMarkingSetup.value) {
      return true
    }
    return false
  }

  function guardExamOwnerAction(actionLabel = '执行该操作'): boolean {
    if (canManageExamOwner.value) {
      return true
    }
    return false
  }

  return {
    canManageExamOwner,
    canManageMarkingSetup,
    guardMarkingSetupAction,
    guardExamOwnerAction,
  }
}
