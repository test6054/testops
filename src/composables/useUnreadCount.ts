/**
 * 统一的未读计数管理
 *
 * 数据来源: /api/inbox/unread-count
 * - 后端已合并: 站内信 + 系统通知 + 系统公告未读数
 * - totalUnreadCount 包含所有类型
 * - 5分钟缓存机制
 */

import type { InboxUnreadCountResponse } from '@/apis/edu/message'
import { computed, readonly, ref } from 'vue'
import { getUnreadCount } from '@/apis/edu/message'
import { getValidToken } from '@/utils/auth'

// 全局状态
const unreadData = ref<InboxUnreadCountResponse | null>({
  tenantId: '0',
  unreadCount: 0,
  unreadSystemNotificationCount: 0,
  totalUnreadCount: 0
})
const loading = ref(false)
const lastFetchTime = ref(0)

// 缓存时间 5分钟
const CACHE_DURATION = 5 * 60 * 1000

/**
 * 统一的未读计数Hook
 */
export function useUnreadCount() {
  const unreadCount = computed(() => unreadData.value?.unreadCount ?? 0)
  const unreadSystemNotificationCount = computed(() => unreadData.value?.unreadSystemNotificationCount ?? 0)
  const totalUnreadCount = computed(() =>
    unreadData.value?.totalUnreadCount ?? (unreadCount.value + unreadSystemNotificationCount.value)
  )

  // 获取未读计数（带缓存）
  const fetchUnreadCount = async (forceRefresh = false): Promise<InboxUnreadCountResponse | null> => {
    // 检查用户认证状态 - 使用有效token检查，避免发送过期token导致401错误
    const token = getValidToken()
    if (!token) {
      return null
    }

    const now = Date.now()

    // 如果有缓存且未过期，直接返回
    if (!forceRefresh && unreadData.value && (now - lastFetchTime.value) < CACHE_DURATION) {
      return unreadData.value
    }

    // 如果正在加载，直接返回当前数据，避免重复请求
    if (loading.value) {
      return unreadData.value
    }

    try {
      loading.value = true
      const data = await getUnreadCount()

      // 检查返回的数据是否有效
      if (data && typeof data === 'object' && 'unreadCount' in data) {
        unreadData.value = data
        lastFetchTime.value = now
      } else {
        // 返回数据格式异常，记录错误并保持之前的值
      }

      return unreadData.value
    } finally {
      loading.value = false
    }
  }

  // 刷新未读计数（强制绕过缓存）
  const refreshUnreadCount = () => fetchUnreadCount(true)

  // 清除缓存（登出时调用）
  const clearCache = () => {
    unreadData.value = {
      tenantId: '0',
      unreadCount: 0,
      unreadSystemNotificationCount: 0,
      totalUnreadCount: 0
    }
    lastFetchTime.value = 0
  }

  // 手动更新未读计数
  const updateUnreadCount = (data: InboxUnreadCountResponse) => {
    unreadData.value = data
    lastFetchTime.value = Date.now()
  }

  return {
    // 状态
    unreadData: readonly(unreadData),
    loading: readonly(loading),

    // 计算属性
    unreadCount,
    unreadSystemNotificationCount,
    totalUnreadCount,

    // 方法
    fetchUnreadCount,
    refreshUnreadCount,
    clearCache,
    updateUnreadCount,

    // 工具方法
    isDataFresh: computed(() => {
      const now = Date.now()
      return unreadData.value && (now - lastFetchTime.value) < CACHE_DURATION
    })
  }
}

/**
 * 全局未读计数实例（单例模式）
 */
export const globalUnreadCount = useUnreadCount()
