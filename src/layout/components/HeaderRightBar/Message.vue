<template>
  <div class="notif-panel" :class="`notif-panel--${variant}`">
    <div class="notif-head">
      <span class="notif-head-title">通知</span>
      <div class="notif-head-actions">
        <button
          type="button"
          class="notif-mark-all"
          :class="{ 'notif-mark-all--disabled': !hasUnreadMessages || readAllLoading }"
          :disabled="!hasUnreadMessages || readAllLoading"
          @click="handleReadAll"
        >
          {{ readAllLoading ? '处理中...' : '全部已读' }}
        </button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="notif-list">
        <div v-if="loadError" class="notif-empty notif-empty--error">
          <span>加载失败，</span>
          <button type="button" class="notif-retry" @click="getMessageData">点击重试</button>
        </div>

        <div v-else-if="!messageList.length" class="notif-empty">暂无未读消息</div>

        <template v-else>
          <div
            v-for="item in messageList"
            :key="item.id"
            class="notif-item notif-item--unread"
            @click="handleItemClick(item)"
          >
            <div class="notif-icon" :class="`notif-icon--${item.tone}`">{{ item.iconText }}</div>
            <div class="notif-body">
              <div class="notif-title">{{ item.subject }}</div>
              <div v-if="item.content" class="notif-desc">{{ item.content }}</div>
              <div class="notif-time">{{ formatRelativeTime(item.sendTime) }}</div>
            </div>
            <div class="notif-unread-dot" />
          </div>
        </template>
      </div>
    </a-spin>

    <div class="notif-foot">
      <button type="button" class="notif-more" @click="goToMessageCenter">查看更多</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type {
  InboxMessageListItemDTO,
  PublishedSystemAnnouncementResponse,
} from '@/apis/edu/message'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getInboxMessages,
  getPublishedAnnouncementList,
  markAllAnnouncementsAsRead,
  markAllAsRead,
  MessageFolderEnum,
} from '@/apis/edu/message'
import router from '@/router'
import { useNotificationStore } from '@/stores/modules/notification'
import { isErrorHandled, showUserError } from '@/utils/error-handler'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'workbench'
  }>(),
  {
    variant: 'default',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'readall-success'): void
}>()

const MESSAGE_LIST_PAGE_SIZE = 5
const MESSAGE_CONTENT_MAX_LENGTH = 50

type NotifTone = 'warn' | 'success' | 'error' | 'info'

interface UnifiedMessageItem {
  id: string
  subject: string
  content?: string
  sendTime: string
  type: 'inbox' | 'announcement'
  tone: NotifTone
  iconText: string
  metadata?: { jumpUrl?: string }
}

const NOTIF_ICON: Record<NotifTone, string> = {
  warn: '⚠',
  error: '✕',
  success: '✓',
  info: '◉',
}

const messageList = ref<UnifiedMessageItem[]>([])
const loading = ref(false)
const loadError = ref(false)
const readAllLoading = ref(false)

const inboxQueryParam = reactive({
  folder: MessageFolderEnum.INBOX,
  isRead: false,
  sort: ['createTime,desc'],
  pageNum: 1,
  pageSize: MESSAGE_LIST_PAGE_SIZE,
})

const notificationStore = useNotificationStore()
const { totalUnreadCount } = storeToRefs(notificationStore)

const hasUnreadMessages = computed(() => messageList.value.length > 0 || totalUnreadCount.value > 0)

/** 按通知类型映射原型图标语义色 */
function resolveNotifTone(
  messageTypeCode?: string,
  itemType?: UnifiedMessageItem['type'],
): NotifTone {
  if (itemType === 'announcement') return 'info'
  if (!messageTypeCode) return 'info'
  const code = messageTypeCode.toUpperCase()
  if (
    code.includes('FAILED')
    || code.includes('ERROR')
    || code.includes('OVERDUE')
    || code.includes('INCONSISTENCY')
    || code.includes('WITHDRAWN')
  ) {
    return 'error'
  }
  if (
    code.includes('REMINDER')
    || code.includes('PENDING')
    || code.includes('WARNING')
    || code.includes('UPCOMING')
  ) {
    return 'warn'
  }
  if (
    code.includes('COMPLETED')
    || code.includes('PUBLISHED')
    || code.includes('CONFIRMED')
    || code.includes('SUCCESS')
  ) {
    return 'success'
  }
  return 'info'
}

function buildMessageItem(
  base: Omit<UnifiedMessageItem, 'tone' | 'iconText'>,
  messageTypeCode?: string,
): UnifiedMessageItem {
  const tone = resolveNotifTone(messageTypeCode, base.type)
  return {
    ...base,
    tone,
    iconText: NOTIF_ICON[tone],
  }
}

const formatRelativeTime = (time?: string): string => {
  if (!time) return ''

  const date = dayjs(time)
  const now = dayjs()

  if (!date.isValid()) return time

  const diffMinutes = now.diff(date, 'minute')
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (date.isSame(now, 'day')) return date.format('HH:mm')
  if (date.isSame(now.subtract(1, 'day'), 'day')) return `昨天 ${date.format('HH:mm')}`
  if (date.isSame(now, 'year')) return date.format('MM-DD HH:mm')
  return date.format('YYYY-MM-DD')
}

const stripHtmlAndTruncate = (html?: string, maxLength = MESSAGE_CONTENT_MAX_LENGTH): string => {
  if (!html) return ''
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
}

const getMessageData = async () => {
  try {
    loading.value = true
    loadError.value = false

    const results = await Promise.allSettled([
      getInboxMessages(inboxQueryParam),
      getPublishedAnnouncementList({
        pageNum: 1,
        pageSize: MESSAGE_LIST_PAGE_SIZE,
        publishedOnly: true,
        unreadOnly: true,
      }),
    ])

    const inboxResult = results[0]
    const announcementResult = results[1]

    if (inboxResult.status === 'rejected' && announcementResult.status === 'rejected') {
      loadError.value = true
      messageList.value = []
      if (!isErrorHandled(inboxResult.reason)) {
        showUserError(inboxResult.reason, '未读消息加载失败，请稍后重试')
      }
      return
    }

    const inboxMessages: UnifiedMessageItem[]
      = inboxResult.status === 'fulfilled'
        ? inboxResult.value.list.map((item: InboxMessageListItemDTO) =>
            buildMessageItem(
              {
                id: item.id,
                subject: item.subject,
                content: stripHtmlAndTruncate(item.contentHtml),
                sendTime: item.sendTime,
                type: 'inbox',
                metadata: item.metadata,
              },
              item.messageType,
            ),
          )
        : []

    const announcementMessages: UnifiedMessageItem[]
      = announcementResult.status === 'fulfilled'
        ? announcementResult.value.list.map((item: PublishedSystemAnnouncementResponse) =>
            buildMessageItem({
              id: item.id,
              subject: item.title,
              content: stripHtmlAndTruncate(item.content),
              sendTime: item.publishTime,
              type: 'announcement',
              metadata: { jumpUrl: `/messages?tab=notice&id=${item.id}` },
            }),
          )
        : []

    if (
      inboxResult.status === 'rejected'
      && inboxMessages.length === 0
      && announcementMessages.length === 0
    ) {
      loadError.value = true
      messageList.value = []
      if (!isErrorHandled(inboxResult.reason)) {
        showUserError(inboxResult.reason, '未读消息加载失败，请稍后重试')
      }
      return
    }

    const allMessages = [...inboxMessages, ...announcementMessages]
    allMessages.sort((a, b) => new Date(b.sendTime).getTime() - new Date(a.sendTime).getTime())
    messageList.value = allMessages.slice(0, MESSAGE_LIST_PAGE_SIZE)
  } catch (error) {
    loadError.value = true
    messageList.value = []
    showUserError(error, '未读消息加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleItemClick = (item: UnifiedMessageItem) => {
  emit('close')
  if (item.metadata?.jumpUrl) {
    router.push(item.metadata.jumpUrl)
  } else {
    const tab = item.type === 'announcement' ? 'notice' : 'msg'
    router.push({ path: '/messages', query: { tab } })
  }
}

const goToMessageCenter = () => {
  emit('close')
  router.push({ path: '/messages', query: { tab: 'msg' } })
}

const handleReadAll = async () => {
  if (!hasUnreadMessages.value || readAllLoading.value) return

  try {
    readAllLoading.value = true
    await Promise.all([markAllAsRead(), markAllAnnouncementsAsRead()])
    message.success('已全部标记为已读')
    messageList.value = []
    emit('readall-success')
  } catch (error) {
    showUserError(error, '消息已读状态更新失败，请稍后重试')
  } finally {
    readAllLoading.value = false
  }
}

onMounted(() => {
  getMessageData()
})
</script>

<style lang="scss" scoped>
.notif-panel {
  width: 320px;
  max-height: 440px;
  background: var(--ant-color-bg-container);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &--workbench {
    width: 360px;
  }
}

.notif-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.notif-head-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.notif-head-actions {
  margin-left: auto;
}

.notif-mark-all {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  color: var(--ant-color-primary);
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--ant-color-primary-hover);
  }

  &--disabled,
  &:disabled {
    color: var(--ant-color-text-quaternary);
    cursor: not-allowed;
  }
}

.notif-list {
  flex: 1;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--ant-color-fill-secondary);
    border-radius: 4px;
  }
}

.notif-empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--ant-color-text-tertiary);

  &--error {
    color: var(--ant-color-error);
  }
}

.notif-retry {
  border: none;
  background: transparent;
  padding: 0;
  color: var(--ant-color-primary);
  cursor: pointer;
  font-size: inherit;

  &:hover {
    color: var(--ant-color-primary-hover);
  }
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--ant-color-fill-quaternary);
  }

  &--unread {
    background: var(--ant-color-primary-bg);

    &:hover {
      background: color-mix(
        in srgb,
        var(--ant-color-primary-bg) 80%,
        var(--ant-color-fill-quaternary) 20%
      );
    }
  }
}

.notif-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;

  &--warn {
    background: #fef3e2;
    color: #e67e22;
  }

  &--success {
    background: #ecfdf5;
    color: #10b981;
  }

  &--error {
    background: #fef2f2;
    color: #ef4444;
  }

  &--info {
    background: #eff6ff;
    color: #3b82f6;
  }
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ant-color-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-desc {
  font-size: 11px;
  color: var(--ant-color-text-tertiary);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-time {
  font-size: 10px;
  color: var(--ant-color-text-quaternary);
  margin-top: 2px;
}

.notif-unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ant-color-primary);
  flex-shrink: 0;
  margin-top: 8px;
}

.notif-foot {
  padding: 8px 20px 12px;
  border-top: 1px solid var(--ant-color-border-secondary);
  text-align: center;
}

.notif-more {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--ant-color-primary);
  cursor: pointer;

  &:hover {
    color: var(--ant-color-primary-hover);
  }
}
</style>
