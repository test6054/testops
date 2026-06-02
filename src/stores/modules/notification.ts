/**
 * 通知统一 Store
 *
 * 业务边界：跨页面共享当前用户的未读消息数与最近消息列表，并提供轮询与已读操作。
 *
 * 后端契约（edu-message）：
 * - GET  /api/inbox/unread-count          — 当前用户未读数（含站内信 + 系统通知 + 公告）
 * - POST /api/inbox/list                  — 站内信列表（按文件夹、消息类型筛选）
 * - POST /api/inbox/update-status         — 标记已读 / 未读 / 归档 / 删除
 * - POST /api/inbox/mark-all-as-read      — 全部标记已读
 *
 * 职责：
 * 1. 接管未读数轮询（可启停）
 * 2. 缓存最近消息列表（用于头部下拉预览）
 * 3. 提供单条 / 批量 / 全部已读操作
 *
 * 不持久化：未读数与列表对实时性敏感，每次启动重新拉取。
 */
import type {
  InboxMessageListItemDTO,
  InboxMessageListQuery,
  InboxMessageMarkRequest,
  InboxUnreadCountResponse,
} from '@/apis/edu/message'
import {
  getInboxMessages,
  getUnreadCount,
  markAllAsRead,
  MessageFolderEnum,
  MessageOperationTypeEnum,
  updateMessageStatus,
} from '@/apis/edu/message'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getValidToken } from '@/utils/auth'
import { readPageList } from '@/utils/page-result'

const DEFAULT_POLL_INTERVAL_MS = 60_000

export const useNotificationStore = defineStore('notification', () => {
  /** 未读数据 */
  const unreadData = ref<InboxUnreadCountResponse | null>(null)
  const unreadLoading = ref(false)

  /** 收件箱预览（按 createTime DESC 取前 10-20 条，用于头部下拉） */
  const recentMessages = ref<InboxMessageListItemDTO[]>([])
  const recentLoading = ref(false)

  /** 轮询计时器；不暴露为响应式状态 */
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const pollIntervalMs = ref<number>(DEFAULT_POLL_INTERVAL_MS)
  const polling = ref(false)

  const lastFetchedAt = ref<number>(0)

  /* ---------- Computed ---------- */

  const unreadCount = computed(() => unreadData.value?.unreadCount ?? 0)
  const unreadSystemCount = computed(() => unreadData.value?.unreadSystemNotificationCount ?? 0)
  const totalUnreadCount = computed(() =>
    unreadData.value?.totalUnreadCount
    ?? (unreadCount.value + unreadSystemCount.value),
  )

  const hasUnread = computed(() => totalUnreadCount.value > 0)

  /* ---------- Helpers ---------- */

  function isAuthenticated(): boolean {
    return !!getValidToken()
  }

  /* ---------- Actions ---------- */

  /**
   * 拉取未读数量；未登录时跳过避免 401。
   */
  async function loadUnreadCount(): Promise<InboxUnreadCountResponse | null> {
    if (!isAuthenticated()) return null
    if (unreadLoading.value) return unreadData.value
    unreadLoading.value = true
    try {
      const data = await getUnreadCount()
      if (data && typeof data === 'object' && 'unreadCount' in data) {
        unreadData.value = data
        lastFetchedAt.value = Date.now()
      }
      return unreadData.value
    }
    finally {
      unreadLoading.value = false
    }
  }

  /**
   * 拉取最近收件箱预览，默认前 20 条，仅 INBOX 文件夹。
   */
  async function loadRecentMessages(query: Partial<InboxMessageListQuery> = {}): Promise<InboxMessageListItemDTO[]> {
    if (!isAuthenticated()) return []
    recentLoading.value = true
    try {
      const result = await getInboxMessages({
        pageNum: query.pageNum ?? 1,
        pageSize: query.pageSize ?? 20,
        folder: query.folder ?? MessageFolderEnum.INBOX,
        messageType: query.messageType,
      })
      recentMessages.value = readPageList(result, '消息列表加载失败，请稍后重试')
      return recentMessages.value
    }
    finally {
      recentLoading.value = false
    }
  }

  /**
   * 标记若干消息已读 / 未读 / 归档 / 删除；后端按操作类型处理。
   */
  async function updateStatus(request: InboxMessageMarkRequest): Promise<void> {
    await updateMessageStatus(request)
    // 已读 / 归档 / 删除都会减少未读数；统一刷新
    if (request.operationType === MessageOperationTypeEnum.MARK_READ
      || request.operationType === MessageOperationTypeEnum.ARCHIVE
      || request.operationType === MessageOperationTypeEnum.TRASH
      || request.operationType === MessageOperationTypeEnum.PURGE
    ) {
      await loadUnreadCount()
    }
  }

  /** 当前用户全部站内信标记已读（不含系统公告，由后端口径决定） */
  async function markAllRead(): Promise<void> {
    if (!isAuthenticated()) return
    await markAllAsRead()
    await loadUnreadCount()
    await loadRecentMessages()
  }

  /* ---------- Polling ---------- */

  /**
   * 启动轮询。已启动时跳过；intervalMs 默认 60s。
   */
  function startPolling(intervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
    if (polling.value) return
    pollIntervalMs.value = intervalMs
    polling.value = true
    pollTimer = setInterval(() => {
      void loadUnreadCount()
    }, intervalMs)
    // 立即触发一次
    void loadUnreadCount()
  }

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    polling.value = false
  }

  /* ---------- Reset ---------- */

  function reset(): void {
    stopPolling()
    unreadData.value = null
    recentMessages.value = []
    lastFetchedAt.value = 0
  }

  return {
    // state
    unreadData,
    unreadLoading,
    recentMessages,
    recentLoading,
    pollIntervalMs,
    polling,
    lastFetchedAt,

    // computed
    unreadCount,
    unreadSystemCount,
    totalUnreadCount,
    hasUnread,

    // actions
    loadUnreadCount,
    loadRecentMessages,
    updateStatus,
    markAllRead,
    startPolling,
    stopPolling,
    reset,
  }
})
