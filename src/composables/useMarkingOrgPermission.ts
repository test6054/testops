import type { Ref } from 'vue'
import { computed } from 'vue'
import type { MarkingOrganizationVO } from '@/apis/mark/marking-organization'
import { useUserStore } from '@/stores/modules/user'

/** 阅卷组织权限：与后端 ExamMarkPermissionService.isExamOwner 对齐，仅考试主考老师可写。 */
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

  function guardExamOwnerAction(): boolean {
    return canManageExamOwner.value
  }

  return {
    canManageExamOwner,
    guardExamOwnerAction,
  }
}
