/**
 * 档案袋代办写操作二次确认：管理员/可代办角色替他人写入时，显式确认目标教师。
 * 本人办理不弹窗；未选教师直接阻断。
 */
import { computed } from 'vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage } from '@/utils/error-handler'

export function usePortfolioProxyWriteGuard() {
  const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()

  const isProxyWrite = computed(() => {
    if (!canPickTeachers.value) {
      return false
    }
    const target = targetTeacherId.value
    const selfId = currentUserId.value
    return Boolean(target && selfId && target !== selfId)
  })

  /**
   * 写操作前校验教师范围；代办时二次确认。
   * @returns true 可继续提交
   */
  async function confirmProxyWrite(actionLabel: string): Promise<boolean> {
    const target = targetTeacherId.value
    if (canPickTeachers.value && !target) {
      showFormValidationMessage('请先从教师名册选择目标教师再办理')
      return false
    }
    if (!isProxyWrite.value) {
      return true
    }
    return confirmAsync({
      title: '确认代办写入',
      content: `当前为代办模式，将以目标教师（编号 ${target}）身份执行「${actionLabel}」。请核对目标教师无误后再继续。`,
      type: 'warning',
      okText: '确认代办写入',
      cancelText: '取消',
    })
  }

  return {
    isProxyWrite,
    confirmProxyWrite,
  }
}
