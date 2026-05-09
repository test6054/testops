<template>
  <GiPageLayout>
    <div class="message-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="message-page__hero-card">
        <div class="message-page__hero">
          <div class="message-page__hero-main">
            <div class="message-page__title-row">
              <h1 class="message-page__title">消息中心</h1>
              <UiTag tone="blue" size="md">站内信 + 系统公告</UiTag>
              <UiTag v-if="unreadTotal > 0" tone="red" size="md">未读 {{ unreadTotal }}</UiTag>
            </div>
            <p class="message-page__desc">
              查看个人站内信与全租户系统公告，可标记单条已读或一键标记全部已读。
            </p>
          </div>
          <div class="message-page__hero-actions">
            <UiButton
              variant="outline"
              size="md"
              :loading="loadingMessages || loadingAnnouncements"
              @click="reloadAll"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新
            </UiButton>
            <UiButton
              size="md"
              :disabled="unreadTotal === 0"
              :loading="markingAll"
              @click="markAllReadAcrossTabs"
            >
              <template #icon>
                <CheckCircleOutlined />
              </template>
              全部标记已读
            </UiButton>
          </div>
        </div>

        <div class="message-page__summary-grid">
          <div class="workspace-summary workspace-summary--accent">
            <span class="workspace-summary__label">未读站内信</span>
            <strong class="workspace-summary__value">{{ unreadInboxCount }}</strong>
            <span class="workspace-summary__desc">用户与系统通知</span>
          </div>
          <div class="workspace-summary">
            <span class="workspace-summary__label">未读系统公告</span>
            <strong class="workspace-summary__value">{{ unreadAnnouncementCount }}</strong>
            <span class="workspace-summary__desc">租户级公告</span>
          </div>
          <div class="workspace-summary">
            <span class="workspace-summary__label">未读合计</span>
            <strong class="workspace-summary__value">{{ unreadTotal }}</strong>
            <span class="workspace-summary__desc">右上角铃铛同步显示</span>
          </div>
          <div class="workspace-summary">
            <span class="workspace-summary__label">最近刷新</span>
            <strong class="workspace-summary__value">{{ lastRefreshTimeText }}</strong>
            <span class="workspace-summary__desc">{{ lastRefreshDateText }}</span>
          </div>
        </div>
      </UiPageCard>

      <!-- Tabs -->
      <UiCard class="message-page__list-card">
        <template #title>
          <BellOutlined />
          <span>消息列表</span>
        </template>

        <a-tabs v-model:active-key="activeTab" @change="onTabChange">
          <!-- 我的消息 -->
          <a-tab-pane key="inbox">
            <template #tab>
              <span class="tab-label">
                我的消息
                <a-badge
                  v-if="unreadInboxCount > 0"
                  :count="unreadInboxCount"
                  :overflow-count="99"
                  :offset="[8, -4]"
                />
              </span>
            </template>

            <div class="filter-bar">
              <a-space wrap>
                <a-input
                  v-model:value="inboxFilter.keyword"
                  placeholder="按主题搜索"
                  allow-clear
                  style="width: 240px"
                  @press-enter="loadMessages(1)"
                />
                <a-select
                  v-model:value="inboxFilter.isRead"
                  placeholder="阅读状态"
                  allow-clear
                  style="width: 140px"
                  :options="readStatusOptions"
                  @change="loadMessages(1)"
                />
                <UiButton size="sm" :loading="loadingMessages" @click="loadMessages(1)">查询</UiButton>
                <UiButton
                  v-if="unreadInboxCount > 0"
                  size="sm"
                  variant="outline"
                  :loading="markingAllInbox"
                  @click="markAllInbox"
                >
                  全部已读
                </UiButton>
              </a-space>
            </div>

            <UiEmpty v-if="!loadingMessages && messages.length === 0" description="暂无站内信" />

            <a-list
              v-else
              :data-source="messages"
              :loading="loadingMessages"
              item-layout="horizontal"
              class="msg-list"
              :pagination="messagePagination"
            >
              <template #renderItem="{ item }">
                <a-list-item class="msg-item" :class="{ 'msg-item--unread': !item.isRead }">
                  <a-list-item-meta>
                    <template #title>
                      <button type="button" class="msg-item__title" @click="openMessageDetail(item)">
                        <span v-if="!item.isRead" class="dot dot--unread" />
                        {{ item.subject || '无主题' }}
                      </button>
                    </template>
                    <template #description>
                      <div class="msg-item__meta">
                        <UiTag tone="blue" size="sm">{{ formatMessageType(item.messageType) }}</UiTag>
                        <span>发自 {{ item.senderInfo?.nickName || item.senderUserId || '系统' }}</span>
                        <span>{{ formatTime(item.sendTime) }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <UiButton size="sm" variant="ghost" @click="openMessageDetail(item)">查看</UiButton>
                    <UiButton
                      v-if="!item.isRead"
                      size="sm"
                      variant="ghost"
                      @click="markMessageRead(item)"
                    >
                      标记已读
                    </UiButton>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-tab-pane>

          <!-- 系统公告 -->
          <a-tab-pane key="announcement">
            <template #tab>
              <span class="tab-label">
                系统公告
                <a-badge
                  v-if="unreadAnnouncementCount > 0"
                  :count="unreadAnnouncementCount"
                  :overflow-count="99"
                  :offset="[8, -4]"
                />
              </span>
            </template>

            <div class="filter-bar">
              <a-space wrap>
                <a-input
                  v-model:value="announcementFilter.titleKeyword"
                  placeholder="按标题搜索"
                  allow-clear
                  style="width: 240px"
                  @press-enter="loadAnnouncements(1)"
                />
                <a-select
                  v-model:value="announcementFilter.priority"
                  placeholder="优先级"
                  allow-clear
                  style="width: 140px"
                  :options="priorityOptions"
                  @change="loadAnnouncements(1)"
                />
                <a-checkbox
                  v-model:checked="announcementFilter.unreadOnly"
                  @change="loadAnnouncements(1)"
                >
                  仅未读
                </a-checkbox>
                <UiButton size="sm" :loading="loadingAnnouncements" @click="loadAnnouncements(1)">查询</UiButton>
                <UiButton
                  v-if="unreadAnnouncementCount > 0"
                  size="sm"
                  variant="outline"
                  :loading="markingAllAnnouncement"
                  @click="markAllAnnouncements"
                >
                  全部已读
                </UiButton>
              </a-space>
            </div>

            <UiEmpty
              v-if="!loadingAnnouncements && announcements.length === 0"
              description="暂无系统公告"
            />

            <a-list
              v-else
              :data-source="announcements"
              :loading="loadingAnnouncements"
              item-layout="horizontal"
              class="msg-list"
              :pagination="announcementPagination"
            >
              <template #renderItem="{ item }">
                <a-list-item class="msg-item" :class="{ 'msg-item--unread': !item.isRead }">
                  <a-list-item-meta>
                    <template #title>
                      <button type="button" class="msg-item__title" @click="openAnnouncementDetail(item)">
                        <span v-if="!item.isRead" class="dot dot--unread" />
                        {{ item.title }}
                      </button>
                    </template>
                    <template #description>
                      <div class="msg-item__meta">
                        <UiTag :tone="getPriorityTone(item.priority)" size="sm">
                          {{ item.priorityName || item.priority }}
                        </UiTag>
                        <span>发布 {{ item.createUserName || '系统' }}</span>
                        <span>{{ formatTime(item.publishTime || item.createTime) }}</span>
                        <span v-if="item.relativeTime" class="muted">{{ item.relativeTime }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <UiButton size="sm" variant="ghost" @click="openAnnouncementDetail(item)">查看</UiButton>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-tab-pane>
        </a-tabs>
      </UiCard>
    </div>

    <!-- 站内信详情抽屉 -->
    <a-drawer
      v-model:open="messageDrawerOpen"
      :title="activeMessage?.subject || '消息详情'"
      width="640"
      placement="right"
    >
      <a-spin :spinning="messageDetailLoading">
        <div v-if="messageDetail" class="msg-detail">
          <div class="msg-detail__meta">
            <UiTag tone="blue" size="sm">{{ formatMessageType(messageDetail.messageType) }}</UiTag>
            <span>发自 {{ messageDetail.senderInfo?.nickName || messageDetail.senderUserId || '系统' }}</span>
            <span>{{ formatTime(messageDetail.sendTime) }}</span>
          </div>
          <a-divider />
          <div class="msg-detail__content" v-html="messageDetail.contentHtml || '<p>无正文</p>'" />
          <div v-if="messageDetail.metadata?.jumpUrl" class="msg-detail__jump">
            <UiButton size="sm" variant="outline" @click="goJump(messageDetail.metadata.jumpUrl)">
              跳转查看相关业务
            </UiButton>
          </div>
        </div>
        <UiEmpty v-else description="无消息详情" />
      </a-spin>
    </a-drawer>

    <!-- 公告详情抽屉 -->
    <a-drawer
      v-model:open="announcementDrawerOpen"
      :title="activeAnnouncement?.title || '公告详情'"
      width="640"
      placement="right"
    >
      <a-spin :spinning="announcementDetailLoading">
        <div v-if="announcementDetail" class="msg-detail">
          <div class="msg-detail__meta">
            <UiTag :tone="getPriorityTone(announcementDetail.priority)" size="sm">
              {{ announcementDetail.priorityName || announcementDetail.priority }}
            </UiTag>
            <span>发布 {{ announcementDetail.createUserName || '系统' }}</span>
            <span>{{ formatTime(announcementDetail.publishTime || announcementDetail.createTime) }}</span>
          </div>
          <a-divider />
          <div class="msg-detail__content" v-html="announcementDetail.content || '<p>无正文</p>'" />
          <a-divider />
          <UiButton
            v-if="!announcementDetail.isRead"
            size="sm"
            :loading="confirmingRead"
            @click="confirmAnnouncementRead(announcementDetail)"
          >
            确认已读
          </UiButton>
          <UiTag v-else tone="green" size="sm">已确认阅读</UiTag>
        </div>
        <UiEmpty v-else description="无公告详情" />
      </a-spin>
    </a-drawer>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {InboxMessageDetailResponse, InboxMessageListItemDTO, SystemAnnouncementResponse} from '@/apis/edu/message';
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  confirmReadAnnouncement,
  getInboxMessages,
  getMessageDetail,
  getPublishedAnnouncementDetail,
  getPublishedAnnouncementList,
  
  
  markAllAnnouncementsAsRead,
  markAllAsRead,
  MessageFolderEnum,
  MessageOperationTypeEnum,
  
  updateMessageStatus
} from '@/apis/edu/message'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'
import { globalUnreadCount } from '@/composables/useUnreadCount'
import { NotificationTypeEnum } from '@/types/enums/notification-type'

defineOptions({ name: 'UserMessage' })

type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

// ─── 顶部聚合 ──────────────────────────────────
const unreadInboxCount = computed(() => globalUnreadCount.unreadCount.value)
const unreadAnnouncementCount = computed(() => globalUnreadCount.unreadSystemNotificationCount.value)
const unreadTotal = computed(() => globalUnreadCount.totalUnreadCount.value)

const lastRefreshAt = ref<Date | null>(null)
const lastRefreshTimeText = computed(() =>
  lastRefreshAt.value ? dayjs(lastRefreshAt.value).format('HH:mm:ss') : '--',
)
const lastRefreshDateText = computed(() =>
  lastRefreshAt.value ? dayjs(lastRefreshAt.value).format('YYYY-MM-DD') : '尚未刷新',
)

const activeTab = ref<'inbox' | 'announcement'>('inbox')

// ─── 站内信 ──────────────────────────────────
const messages = ref<InboxMessageListItemDTO[]>([])
const loadingMessages = ref(false)
const inboxFilter = reactive<{ keyword?: string, isRead?: boolean }>({})
const messagePageState = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const messagePagination = computed(() => ({
  current: messagePageState.pageNum,
  pageSize: messagePageState.pageSize,
  total: messagePageState.total,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange: (page: number, size: number) => {
    messagePageState.pageNum = page
    messagePageState.pageSize = size
    loadMessages(page)
  },
}))

const readStatusOptions = [
  { value: false, label: '未读' },
  { value: true, label: '已读' },
]

async function loadMessages(page = messagePageState.pageNum) {
  loadingMessages.value = true
  try {
    const result = await getInboxMessages({
      folder: MessageFolderEnum.INBOX,
      keyword: inboxFilter.keyword?.trim() || undefined,
      isRead: inboxFilter.isRead,
      pageNum: page,
      pageSize: messagePageState.pageSize,
    })
    messages.value = result.list ?? []
    messagePageState.pageNum = result.pageNum ?? page
    messagePageState.pageSize = result.pageSize ?? messagePageState.pageSize
    messagePageState.total = result.total ?? 0
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载站内信失败'
    message.error(msg)
  }
  finally {
    loadingMessages.value = false
  }
}

// ─── 系统公告 ──────────────────────────────────
const announcements = ref<SystemAnnouncementResponse[]>([])
const loadingAnnouncements = ref(false)
const announcementFilter = reactive<{ titleKeyword?: string, priority?: string, unreadOnly?: boolean }>({})
const announcementPageState = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const announcementPagination = computed(() => ({
  current: announcementPageState.pageNum,
  pageSize: announcementPageState.pageSize,
  total: announcementPageState.total,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange: (page: number, size: number) => {
    announcementPageState.pageNum = page
    announcementPageState.pageSize = size
    loadAnnouncements(page)
  },
}))

const priorityOptions = [
  { value: 'NORMAL', label: '普通' },
  { value: 'IMPORTANT', label: '重要' },
]

async function loadAnnouncements(page = announcementPageState.pageNum) {
  loadingAnnouncements.value = true
  try {
    const result = await getPublishedAnnouncementList({
      titleKeyword: announcementFilter.titleKeyword?.trim() || undefined,
      priority: announcementFilter.priority,
      unreadOnly: announcementFilter.unreadOnly,
      publishedOnly: true,
      pageNum: page,
      pageSize: announcementPageState.pageSize,
    })
    announcements.value = result.list ?? []
    announcementPageState.pageNum = result.pageNum ?? page
    announcementPageState.pageSize = result.pageSize ?? announcementPageState.pageSize
    announcementPageState.total = result.total ?? 0
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载系统公告失败'
    message.error(msg)
  }
  finally {
    loadingAnnouncements.value = false
  }
}

// ─── 详情抽屉 ──────────────────────────────────
const messageDrawerOpen = ref(false)
const messageDetail = ref<InboxMessageDetailResponse | null>(null)
const messageDetailLoading = ref(false)
const activeMessage = ref<InboxMessageListItemDTO | null>(null)

async function openMessageDetail(item: InboxMessageListItemDTO) {
  activeMessage.value = item
  messageDrawerOpen.value = true
  messageDetailLoading.value = true
  messageDetail.value = null
  try {
    messageDetail.value = await getMessageDetail({ id: item.id })
    if (!item.isRead) {
      item.isRead = true
      await markMessageReadInternal([item.id])
    }
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载消息详情失败'
    message.error(msg)
  }
  finally {
    messageDetailLoading.value = false
  }
}

async function markMessageReadInternal(ids: string[]) {
  if (ids.length === 0) return
  try {
    await updateMessageStatus({
      recipientMessageIds: ids,
      operationType: MessageOperationTypeEnum.MARK_READ,
    })
    await globalUnreadCount.refreshUnreadCount()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '标记已读失败'
    message.error(msg)
  }
}

async function markMessageRead(item: InboxMessageListItemDTO) {
  if (item.isRead) return
  await markMessageReadInternal([item.id])
  item.isRead = true
}

const markingAllInbox = ref(false)
async function markAllInbox() {
  markingAllInbox.value = true
  try {
    await markAllAsRead()
    message.success('已将所有站内信标记为已读')
    await globalUnreadCount.refreshUnreadCount()
    await loadMessages()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    message.error(msg)
  }
  finally {
    markingAllInbox.value = false
  }
}

// 公告详情
const announcementDrawerOpen = ref(false)
const announcementDetail = ref<SystemAnnouncementResponse | null>(null)
const announcementDetailLoading = ref(false)
const activeAnnouncement = ref<SystemAnnouncementResponse | null>(null)

async function openAnnouncementDetail(item: SystemAnnouncementResponse) {
  activeAnnouncement.value = item
  announcementDrawerOpen.value = true
  announcementDetailLoading.value = true
  announcementDetail.value = null
  try {
    announcementDetail.value = await getPublishedAnnouncementDetail(item.id)
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载公告详情失败'
    message.error(msg)
  }
  finally {
    announcementDetailLoading.value = false
  }
}

const confirmingRead = ref(false)
async function confirmAnnouncementRead(item: SystemAnnouncementResponse) {
  if (item.isRead) return
  confirmingRead.value = true
  try {
    await confirmReadAnnouncement(item.id)
    item.isRead = true
    const found = announcements.value.find(a => a.id === item.id)
    if (found) found.isRead = true
    message.success('已确认阅读')
    await globalUnreadCount.refreshUnreadCount()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '确认阅读失败'
    message.error(msg)
  }
  finally {
    confirmingRead.value = false
  }
}

const markingAllAnnouncement = ref(false)
async function markAllAnnouncements() {
  markingAllAnnouncement.value = true
  try {
    await markAllAnnouncementsAsRead()
    message.success('已将所有公告标记为已读')
    await globalUnreadCount.refreshUnreadCount()
    await loadAnnouncements()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    message.error(msg)
  }
  finally {
    markingAllAnnouncement.value = false
  }
}

// 一键全部已读（双通道）
const markingAll = ref(false)
async function markAllReadAcrossTabs() {
  markingAll.value = true
  try {
    if (unreadInboxCount.value > 0) {
      await markAllAsRead()
    }
    if (unreadAnnouncementCount.value > 0) {
      await markAllAnnouncementsAsRead()
    }
    message.success('已将所有未读消息和公告标记为已读')
    await globalUnreadCount.refreshUnreadCount()
    await Promise.all([loadMessages(), loadAnnouncements()])
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    message.error(msg)
  }
  finally {
    markingAll.value = false
  }
}

// ─── 工具 ──────────────────────────────────
function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function formatMessageType(type?: NotificationTypeEnum): string {
  if (!type) return '消息'
  const map: Partial<Record<NotificationTypeEnum, string>> = {
    [NotificationTypeEnum.SYSTEM_NOTIFICATION]: '系统通知',
    [NotificationTypeEnum.SYSTEM_ALERT]: '系统告警',
    [NotificationTypeEnum.CLASS_ANNOUNCEMENT]: '班级公告',
    [NotificationTypeEnum.ACCOUNT_SECURITY]: '账号安全',
    [NotificationTypeEnum.SCORE_PUBLISHED]: '成绩发布',
    [NotificationTypeEnum.SCORE_RULE_PUBLISHED]: '成绩规则',
    [NotificationTypeEnum.RESUBMIT_REQUESTED]: '重新提交申请',
    [NotificationTypeEnum.RESUBMIT_APPROVED]: '重新提交通过',
    [NotificationTypeEnum.RESUBMIT_REJECTED]: '重新提交驳回',
  }
  return map[type] || type
}

function getPriorityTone(priority?: string): ToneCode {
  if (priority === 'IMPORTANT') return 'red'
  return 'blue'
}

function goJump(url?: string) {
  if (!url) return
  if (/^https?:\/\//i.test(url)) {
    window.open(url, '_blank')
  }
  else {
    window.location.assign(url)
  }
}

// ─── 编排 ──────────────────────────────────
function onTabChange(key: string | number) {
  const next = key as 'inbox' | 'announcement'
  if (next === 'inbox' && messages.value.length === 0) {
    loadMessages(1)
  }
  else if (next === 'announcement' && announcements.value.length === 0) {
    loadAnnouncements(1)
  }
}

async function reloadAll() {
  lastRefreshAt.value = new Date()
  await Promise.all([
    loadMessages(messagePageState.pageNum),
    loadAnnouncements(announcementPageState.pageNum),
    globalUnreadCount.refreshUnreadCount(),
  ])
}

onMounted(async () => {
  lastRefreshAt.value = new Date()
  await Promise.all([
    loadMessages(1),
    loadAnnouncements(1),
    globalUnreadCount.fetchUnreadCount(),
  ])
})
</script>

<style lang="scss" scoped>
.message-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.message-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.message-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.message-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.message-page__desc {
  margin: 0;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.message-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-bar {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-md, 8px);
}

.msg-list {
  :deep(.ant-list-item) {
    padding: 14px 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md, 8px);
    margin-bottom: 10px;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  :deep(.ant-list-item:last-child) {
    margin-bottom: 0;
  }
}

.msg-item {
  &--unread {
    :deep(.ant-list-item) {
      border-color: rgba(22, 119, 255, 0.3);
      background: linear-gradient(135deg, rgba(22, 119, 255, 0.04) 0%, rgba(22, 119, 255, 0.01) 100%);
    }
  }

  &__title {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--ant-color-text);
    font-size: 14px;
    font-weight: 600;
    text-align: left;
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &:hover {
      color: var(--ant-color-primary);
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    flex-wrap: wrap;
    margin-top: 4px;
  }
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &--unread {
    background: var(--ant-color-error);
  }
}

.msg-detail {
  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    flex-wrap: wrap;
  }

  &__content {
    font-size: 14px;
    line-height: 1.7;
    color: var(--ant-color-text);

    :deep(p) {
      margin: 0 0 12px;
    }

    :deep(a) {
      color: var(--ant-color-primary);
    }
  }

  &__jump {
    margin-top: 16px;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
