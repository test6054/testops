/**
 * 教学档案袋跨页面教师上下文 Store。
 * 与 URL `?teacherId=` 及 PortfolioScopeHeader 联动。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePortfolioStore = defineStore('portfolio', () => {
  /** 当前目标教师 userId（管理员代操作时） */
  const currentTeacherId = ref('')

  /** 教师范围切换代际，供 keepAlive 页面统一刷新 */
  const scopeChangeEpoch = ref(0)

  function bumpScopeChangeEpoch(): void {
    scopeChangeEpoch.value += 1
  }

  function setTeacher(teacherId: string): void {
    if (currentTeacherId.value === teacherId) {
      return
    }
    currentTeacherId.value = teacherId
    bumpScopeChangeEpoch()
  }

  function reset(): void {
    currentTeacherId.value = ''
    bumpScopeChangeEpoch()
  }

  return {
    currentTeacherId,
    scopeChangeEpoch,
    setTeacher,
    reset,
    bumpScopeChangeEpoch,
  }
})
