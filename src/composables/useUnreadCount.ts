/**
 * 未读计数管理（兼容层）
 *
 * 数据来源: /api/inbox/unread-count
 *
 * 实现已迁移到 Pinia useNotificationStore；本文件保留为兼容入口，
 * 让现有的 HeaderRightBar / user/message / user/profile 等无需改动
 * 即可共享全局通知 Store。
 *
 * 业务场景：
 * - 旧调用方：globalUnreadCount.totalUnreadCount / fetchUnreadCount() / clearCache()
 * - 新调用方：直接 useNotificationStore() 使用 startPolling / loadRecentMessages / markAllRead
 */

import type { InboxUnreadCountResponse } from '@/apis/edu/message'
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/modules/notification'

/**
 * 统一的未读计数 Hook（兼容层）
 */
export function useUnreadCount() {
  const store = useNotificationStore()

  const unreadData = computed<InboxUnreadCountResponse | null>(() => store.unreadData)
  const loading = computed<boolean>(() => store.unreadLoading)

  const unreadCount = computed<number>(() => store.unreadCount)
  const unreadSystemNotificationCount = computed<number>(() => store.unreadSystemCount)
  const totalUnreadCount = computed<number>(() => store.totalUnreadCount)

  /** 获取未读计数；forceRefresh 在 Store 层面立即重拉 */
  async function fetchUnreadCount(_forceRefresh = false): Promise<InboxUnreadCountResponse | null> {
    return store.loadUnreadCount()
  }

  /** 强制刷新（语义上等价于 fetchUnreadCount(true)） */
  function refreshUnreadCount(): Promise<InboxUnreadCountResponse | null> {
    return store.loadUnreadCount()
  }

  /** 清除缓存（登出时调用）。同时停止轮询。 */
  function clearCache(): void {
    store.reset()
  }

  /** 手动更新未读计数（推送到达时业务层主动写） */
  function updateUnreadCount(data: InboxUnreadCountResponse): void {
    store.unreadData = data
  }

  /** 数据是否新鲜（基于 Store 上次拉取时间，60s 内视为新鲜） */
  const isDataFresh = computed(() => {
    if (!store.lastFetchedAt) return false
    return Date.now() - store.lastFetchedAt < 60_000
  })

  return {
    unreadData,
    loading,
    unreadCount,
    unreadSystemNotificationCount,
    totalUnreadCount,
    fetchUnreadCount,
    refreshUnreadCount,
    clearCache,
    updateUnreadCount,
    isDataFresh,
  }
}

/**
 * 全局未读计数兼容入口。
 *
 * 注意：必须确保 Pinia 在调用前已激活（main.ts 中 `app.use(pinia)` 之后）。
 * 这里使用 getter 模式延迟初始化，避免 module-load 时 Pinia 尚未挂载导致 getActivePinia() 报错。
 */
let cachedHook: ReturnType<typeof useUnreadCount> | null = null
export const globalUnreadCount = new Proxy({} as ReturnType<typeof useUnreadCount>, {
  get(_target, prop) {
    if (cachedHook === null) {
      cachedHook = useUnreadCount()
    }
    return Reflect.get(cachedHook, prop)
  },
})
