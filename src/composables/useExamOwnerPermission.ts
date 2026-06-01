import type { ComputedRef, Ref } from 'vue'
import { computed } from 'vue'
import { useUserStore } from '@/stores/modules/user'

export interface ExamOwnerSource {
  createUser?: string
}

export interface ExamOwnerPermissionState {
  currentUserId: ComputedRef<string>
  isExamOwner: ComputedRef<boolean>
}

/** 基于后端 Exam.createUser 合同判断当前用户是否为考试创建人，仅用于前端入口显隐。 */
export function useExamOwnerPermission(
  exam: Ref<ExamOwnerSource | null | undefined>,
): ExamOwnerPermissionState {
  const userStore = useUserStore()
  const currentUserId = computed(() => userStore.userInfo.userId)
  const isExamOwner = computed(() => {
    const ownerUserId = exam.value?.createUser
    if (!ownerUserId) {
      return false
    }
    return ownerUserId === currentUserId.value
  })
  return {
    currentUserId,
    isExamOwner,
  }
}
