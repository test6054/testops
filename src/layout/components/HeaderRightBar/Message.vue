<template>
  <div class="message-popup">
    <!-- 标题栏 -->
    <div class="popup-header">
      <span class="header-title">未读消息（{{ totalUnreadCount }}）</span>
    </div>

    <!-- 消息列表 -->
    <div class="popup-body">
      <a-spin :spinning="loading" style="width: 100%">
        <div v-if="!messageList || messageList.length === 0" class="empty-state">
          <span>暂无未读消息</span>
        </div>

        <div v-else class="message-list">
          <div
            v-for="item in messageList"
            :key="item.id"
            class="message-item"
            @click="handleItemClick(item)"
          >
            <div class="item-title">{{ item.subject }}</div>
            <div v-if="item.content" class="item-content">{{ item.content }}</div>
            <div class="item-time">{{ formatRelativeTime(item.sendTime) }}</div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 底部操作栏 -->
    <div class="popup-footer">
      <a class="footer-link" @click="goToMessageCenter">
        查看更多
        <ExportOutlined class="link-icon" />
      </a>
      <span class="footer-divider">|</span>
      <a
        class="footer-link"
        :class="{ disabled: !hasUnreadMessages || readAllLoading }"
        @click="handleReadAll"
      >
        {{ readAllLoading ? '处理中...' : '全部已读' }}
      </a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type {
  InboxMessageListItemDTO,
  PublishedSystemAnnouncementResponse,
} from '@/apis/edu/message'
import ExportOutlined from '@ant-design/icons-vue/ExportOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getInboxMessages,
  getPublishedAnnouncementList,
  markAllAnnouncementsAsRead,
  markAllAsRead,
} from '@/apis/edu/message'
import router from '@/router'
import { useNotificationStore } from '@/stores/modules/notification'
import { showUserError } from '@/utils/error-handler'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'readall-success'): void
}>()

// 常量定义
const MESSAGE_LIST_PAGE_SIZE = 5
const MESSAGE_CONTENT_MAX_LENGTH = 50

// 统一的消息列表项类型
interface UnifiedMessageItem {
  id: string
  subject: string
  content?: string
  sendTime: string
  type: 'inbox' | 'announcement'
  metadata?: { jumpUrl?: string }
}

// 状态定义
const messageList = ref<UnifiedMessageItem[]>([])
const loading = ref(false)
const readAllLoading = ref(false)

const inboxQueryParam = reactive({
  isRead: false,
  sort: ['createTime,desc'],
  pageNum: 1,
  pageSize: MESSAGE_LIST_PAGE_SIZE,
})

// 使用通知 Store 的统一未读计数（后端已合并站内信 + 系统公告）
const notificationStore = useNotificationStore()
const { totalUnreadCount } = storeToRefs(notificationStore)

// 是否有未读消息（用于控制「全部已读」按钮状态）
const hasUnreadMessages = computed(() => messageList.value.length > 0 || totalUnreadCount.value > 0)
// 格式化相对时间：今天 HH:mm / 昨天 HH:mm / 今年 MM-DD HH:mm / 更早 YYYY-MM-DD
const formatRelativeTime = (time?: string): string => {
  if (!time) return ''

  const date = dayjs(time)
  const now = dayjs()

  if (!date.isValid()) return time

  if (date.isSame(now, 'day')) return date.format('HH:mm')
  if (date.isSame(now.subtract(1, 'day'), 'day')) return `昨天 ${date.format('HH:mm')}`
  if (date.isSame(now, 'year')) return date.format('MM-DD HH:mm')
  return date.format('YYYY-MM-DD')
}

// 去除HTML标签并截取内容
const stripHtmlAndTruncate = (html?: string, maxLength = MESSAGE_CONTENT_MAX_LENGTH): string => {
  if (!html) return ''
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 查询消息数据（同时获取站内信和系统公告，单个失败不影响另一个）
const getMessageData = async () => {
  try {
    loading.value = true

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

    // 两个接口都失败才展示错误状态
    if (inboxResult.status === 'rejected' && announcementResult.status === 'rejected') {
      messageList.value = []
      showUserError(inboxResult.reason, '未读消息加载失败，请稍后重试')
      return
    }

    const inboxMessages: UnifiedMessageItem[]
      = inboxResult.status === 'fulfilled'
        ? inboxResult.value.list.map((item: InboxMessageListItemDTO) => ({
            id: item.id,
            subject: item.subject,
            content: stripHtmlAndTruncate(item.contentHtml),
            sendTime: item.sendTime,
            type: 'inbox' as const,
            metadata: item.metadata,
          }))
        : []

    const announcementMessages: UnifiedMessageItem[]
      = announcementResult.status === 'fulfilled'
        ? announcementResult.value.list.map((item: PublishedSystemAnnouncementResponse) => ({
            id: item.id,
            subject: `【公告】${item.title}`,
            content: stripHtmlAndTruncate(item.content),
            sendTime: item.publishTime,
            type: 'announcement' as const,
            metadata: { jumpUrl: `/messages?tab=notice&id=${item.id}` },
          }))
        : []

    const allMessages = [...inboxMessages, ...announcementMessages]
    allMessages.sort((a, b) => new Date(b.sendTime).getTime() - new Date(a.sendTime).getTime())
    messageList.value = allMessages.slice(0, MESSAGE_LIST_PAGE_SIZE)
  } catch (error) {
    messageList.value = []
    showUserError(error, '未读消息加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 点击消息项
const handleItemClick = (item: UnifiedMessageItem) => {
  emit('close')
  if (item.metadata?.jumpUrl) {
    router.push(item.metadata.jumpUrl)
  } else {
    const tab = item.type === 'announcement' ? 'notice' : 'msg'
    router.push({ path: '/messages', query: { tab } })
  }
}

// 跳转到消息中心
const goToMessageCenter = () => {
  emit('close')
  router.push({ path: '/messages', query: { tab: 'msg' } })
}

// 全部已读操作（只 emit，由父组件统一刷新计数，避免双重请求）
const handleReadAll = async () => {
  if (!hasUnreadMessages.value || readAllLoading.value) return

  try {
    readAllLoading.value = true
    await Promise.all([markAllAsRead(), markAllAnnouncementsAsRead()])
    message.success('已全部标记为已读')
    // 清空当前列表，计数由父组件刷新
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
.message-popup {
  width: 320px;
  background: var(--ant-color-bg-elevated);
  border-radius: var(--dp-radius-xs);

  // 标题栏
  .popup-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--ant-color-border-secondary);

    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--ant-color-text);
    }
  }

  // 消息列表区域
  .popup-body {
    max-height: 380px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--ant-color-fill-secondary);
      border-radius: var(--dp-radius-xs);
    }

    .empty-state {
      padding: 40px 16px;
      text-align: center;
      color: var(--ant-color-text-tertiary);
      font-size: 13px;
    }

    .message-list {
      .message-item {
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-bottom: 1px solid var(--ant-color-border);

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background-color: var(--ant-color-fill-quaternary);
        }

        .item-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--ant-color-text);
          line-height: 1.5;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-content {
          font-size: 12px;
          color: var(--ant-color-text-secondary);
          line-height: 1.5;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .item-time {
          font-size: 12px;
          color: var(--ant-color-text-tertiary);
        }
      }
    }
  }

  // 底部操作栏
  .popup-footer {
    padding: 10px 16px;
    border-top: 1px solid var(--ant-color-border-secondary);
    display: flex;
    align-items: center;
    gap: 8px;

    .footer-link {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      color: var(--ant-color-primary);
      cursor: pointer;
      transition: color 0.2s;

      .link-icon {
        font-size: 12px;
      }

      &:hover {
        color: var(--ant-color-primary-hover);
      }

      // 禁用状态
      &.disabled {
        color: var(--dp-text-disabled);
        cursor: not-allowed;

        &:hover {
          color: var(--dp-text-disabled);
        }
      }
    }

    .footer-divider {
      color: var(--ant-color-split);
      font-size: 12px;
    }
  }
}
</style>
