import type { Ref } from 'vue'
import type { MarkingOrganizationResponse } from '@/apis/mark/marking-organization'
import { computed } from 'vue'

/**
 * 阅卷组织权限：与后端 canManageExamOwner（主考 ∧ ACTIVE）对齐。
 * MVR-324/358：仅认 BE 下发 canManageExamOwner===true；禁止本地 createUser 回退。
 * examCreateUserId 参数保留调用签名，不再参与门禁判定。
 */
export function useMarkingOrgPermission(
  _examCreateUserId: Ref<string | undefined>,
  organization: Ref<MarkingOrganizationResponse | null | undefined>,
) {
  const canManageExamOwner = computed(() => organization.value?.canManageExamOwner === true)

  function guardExamOwnerAction(): boolean {
    return canManageExamOwner.value === true
  }

  return {
    canManageExamOwner,
    guardExamOwnerAction,
  }
}
