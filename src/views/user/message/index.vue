<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="消息中心"
      >
        <template #status>
          <UiTag tone="blue" size="sm">站内信 + 系统公告</UiTag>
          <UiTag v-if="unreadTotal > 0" tone="red" size="sm">未读 {{ unreadTotal }}</UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :loading="loadingMessages || loadingAnnouncements"
            @click="reloadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            size="sm"
            :disabled="unreadTotal === 0"
            :loading="markingAll"
            @click="markAllReadAcrossTabs"
          >
            <template #icon><CheckCircleOutlined /></template>
            全部标记已读
          </UiButton>
        </template>
      </ContextBar>
    </template>

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

          <UiFilterBar
            v-model="inboxFilter"
            :fields="inboxFilterFields"
            search-text="查询"
            @search="() => loadMessages(1)"
            @reset="handleInboxReset"
          />
          <div v-if="unreadInboxCount > 0" class="message-tab__mark-all">
            <UiButton
              size="sm"
              variant="outline"
              :loading="markingAllInbox"
              @click="markAllInbox"
            >
              全部已读
            </UiButton>
          </div>

          <UiEmpty v-if="!loadingMessages && messages.length === 0" description="暂无数据" />

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
                      {{ item.subject }}
                    </button>
                  </template>
                  <template #description>
                    <div class="msg-item__meta">
                      <UiTag tone="blue" size="sm">
                        {{ formatMessageType(item.messageType) }}
                      </UiTag>
                      <span>发自 {{ messageSenderName(item.senderInfo) }}</span>
                      <span>{{ formatDateTime(item.sendTime) }}</span>
                    </div>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <UiButton size="sm" variant="ghost" @click="openMessageDetail(item)">
                    查看
                  </UiButton>
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

          <UiFilterBar
            v-model="announcementFilter"
            :fields="announcementFilterFields"
            search-text="查询"
            @search="() => loadAnnouncements(1)"
            @reset="handleAnnouncementReset"
          >
            <template #field-unreadOnly>
              <a-checkbox v-model:checked="announcementFilter.unreadOnly">仅未读</a-checkbox>
            </template>
          </UiFilterBar>
          <div v-if="unreadAnnouncementCount > 0" class="message-tab__mark-all">
            <UiButton
              size="sm"
              variant="outline"
              :loading="markingAllAnnouncement"
              @click="markAllAnnouncements"
            >
              全部已读
            </UiButton>
          </div>

          <UiEmpty
            v-if="!loadingAnnouncements && announcements.length === 0"
            description="暂无数据"
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
                    <button
                      type="button"
                      class="msg-item__title"
                      @click="openAnnouncementDetail(item)"
                    >
                      <span v-if="!item.isRead" class="dot dot--unread" />
                      {{ item.title }}
                    </button>
                  </template>
                  <template #description>
                    <div class="msg-item__meta">
                      <UiTag :tone="getPriorityTone(item.priority)" size="sm">
                        {{ item.priorityName }}
                      </UiTag>
                      <span>发布 {{ item.createUserName }}</span>
                      <span>{{ formatDateTime(item.publishTime) }}</span>
                      <span v-if="item.relativeTime" class="muted">{{ item.relativeTime }}</span>
                    </div>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <UiButton size="sm" variant="ghost" @click="openAnnouncementDetail(item)">
                    查看
                  </UiButton>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>

  <!-- 站内信详情抽屉 -->
  <a-drawer
    v-model:open="messageDrawerOpen"
    :title="activeMessage?.subject"
    width="640"
    placement="right"
  >
    <a-spin :spinning="messageDetailLoading">
      <div v-if="messageDetail" class="msg-detail">
        <div class="msg-detail__meta">
          <UiTag tone="blue" size="sm">{{ formatMessageType(messageDetail.messageType) }}</UiTag>
          <span>发自 {{ messageSenderName(messageDetail.senderInfo) }}</span>
          <span>{{ formatDateTime(messageDetail.sendTime) }}</span>
        </div>
        <a-divider />
        <div class="msg-detail__content" v-html="messageDetail.contentHtml" />
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
    :title="activeAnnouncement?.title"
    width="640"
    placement="right"
  >
    <a-spin :spinning="announcementDetailLoading">
      <div v-if="announcementDetail" class="msg-detail">
        <div class="msg-detail__meta">
          <UiTag :tone="getPriorityTone(announcementDetail.priority)" size="sm">
            {{ announcementDetail.priorityName }}
          </UiTag>
          <span>发布 {{ announcementDetail.createUserName }}</span>
          <span>{{ formatDateTime(announcementDetail.publishTime) }}</span>
        </div>
        <a-divider />
        <div class="msg-detail__content" v-html="announcementDetail.content" />
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
</template>

<script lang="ts" setup>
import type {
  InboxMessageDetailResponse,
  InboxMessageListItemDTO,
  PublishedSystemAnnouncementResponse,
} from '@/apis/edu/message'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { UserDto } from '@/types/api-types.d'
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
  updateMessageStatus,
} from '@/apis/edu/message'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useNotificationStore } from '@/stores/modules/notification'
import { NotificationTypeEnum } from '@/types/enums/notification-type'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'UserMessage' })

const router = useRouter()

type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

// ─── 顶部聚合 ──────────────────────────────────
const notificationStore = useNotificationStore()
const {
  unreadCount: unreadInboxCount,
  unreadSystemCount: unreadAnnouncementCount,
  totalUnreadCount: unreadTotal,
} = storeToRefs(notificationStore)

const lastRefreshAt = ref<Date | null>(null)

const activeTab = ref<'inbox' | 'announcement'>('inbox')

// ─── 站内信 ──────────────────────────────────
const messages = ref<InboxMessageListItemDTO[]>([])
const loadingMessages = ref(false)
const inboxFilter = reactive<{ keyword?: string, isRead?: string }>({})
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
  { value: 'false', label: '未读' },
  { value: 'true', label: '已读' },
]

const inboxFilterFields: FilterField[] = [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '按主题搜索',
    allowClear: true,
    width: 240,
    triggerSearchOnChange: false,
  },
  {
    key: 'isRead',
    type: 'select',
    placeholder: '阅读状态',
    allowClear: true,
    width: 140,
    options: readStatusOptions,
  },
]

const announcementFilterFields: FilterField[] = [
  {
    key: 'titleKeyword',
    type: 'input',
    placeholder: '按标题搜索',
    allowClear: true,
    width: 240,
    triggerSearchOnChange: false,
  },
  {
    key: 'priority',
    type: 'select',
    placeholder: '优先级',
    allowClear: true,
    width: 140,
    options: [
      { value: 'NORMAL', label: '普通' },
      { value: 'IMPORTANT', label: '重要' },
    ],
  },
  { key: 'unreadOnly', label: '筛选' },
]

function handleInboxReset(): void {
  inboxFilter.keyword = undefined
  inboxFilter.isRead = undefined
  messagePageState.pageNum = 1
  void loadMessages(1)
}

function handleAnnouncementReset(): void {
  announcementFilter.titleKeyword = undefined
  announcementFilter.priority = undefined
  announcementFilter.unreadOnly = undefined
  announcementPageState.pageNum = 1
  void loadAnnouncements(1)
}

async function loadMessages(page = messagePageState.pageNum) {
  loadingMessages.value = true
  try {
    const result = await getInboxMessages({
      folder: MessageFolderEnum.INBOX,
      keyword: inboxFilter.keyword?.trim() || undefined,
      isRead: inboxFilter.isRead != null ? inboxFilter.isRead === 'true' : undefined,
      pageNum: page,
      pageSize: messagePageState.pageSize,
    })
    messages.value = result.list
    messagePageState.pageNum = result.pageNum
    messagePageState.pageSize = result.pageSize
    messagePageState.total = result.total
  } catch (error) {
    showUserError(error, '站内信加载失败')
  } finally {
    loadingMessages.value = false
  }
}

// ─── 系统公告 ──────────────────────────────────
const announcements = ref<PublishedSystemAnnouncementResponse[]>([])
const loadingAnnouncements = ref(false)
const announcementFilter = reactive<{
  titleKeyword?: string
  priority?: string
  unreadOnly?: boolean
}>({})
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
    announcements.value = result.list
    announcementPageState.pageNum = result.pageNum
    announcementPageState.pageSize = result.pageSize
    announcementPageState.total = result.total
  } catch (error) {
    showUserError(error, '系统公告加载失败')
  } finally {
    loadingAnnouncements.value = false
  }
}

// ─── 详情抽屉 ──────────────────────────────────
const messageDrawerOpen = ref(false)
const messageDetail = ref<InboxMessageDetailResponse | null>(null)
const messageDetailLoading = ref(false)
const activeMessage = ref<InboxMessageListItemDTO | null>(null)

async function openMessageDetail(item: InboxMessageListItemDTO) {
  if (item.metadata?.jumpUrl) {
    if (!item.isRead) {
      item.isRead = true
      await markMessageReadInternal([item.id])
    }
    goJump(item.metadata.jumpUrl)
    return
  }
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
  } catch (error) {
    showUserError(error, '消息详情加载失败')
  } finally {
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
    await notificationStore.loadUnreadCount()
  } catch (error) {
    showUserError(error, '消息已读状态更新失败')
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
    await notificationStore.loadUnreadCount()
    await loadMessages()
  } catch (error) {
    showUserError(error, '站内信批量标记已读失败')
  } finally {
    markingAllInbox.value = false
  }
}

// 公告详情
const announcementDrawerOpen = ref(false)
const announcementDetail = ref<PublishedSystemAnnouncementResponse | null>(null)
const announcementDetailLoading = ref(false)
const activeAnnouncement = ref<PublishedSystemAnnouncementResponse | null>(null)

async function openAnnouncementDetail(item: PublishedSystemAnnouncementResponse) {
  activeAnnouncement.value = item
  announcementDrawerOpen.value = true
  announcementDetailLoading.value = true
  announcementDetail.value = null
  try {
    announcementDetail.value = await getPublishedAnnouncementDetail(item.id)
  } catch (error) {
    showUserError(error, '公告详情加载失败')
  } finally {
    announcementDetailLoading.value = false
  }
}

const confirmingRead = ref(false)
async function confirmAnnouncementRead(item: PublishedSystemAnnouncementResponse) {
  if (item.isRead) return
  confirmingRead.value = true
  try {
    await confirmReadAnnouncement(item.id)
    item.isRead = true
    const found = announcements.value.find((a) => a.id === item.id)
    if (found) found.isRead = true
    message.success('已确认阅读')
    await notificationStore.loadUnreadCount()
  } catch (error) {
    showUserError(error, '公告阅读确认失败')
  } finally {
    confirmingRead.value = false
  }
}

const markingAllAnnouncement = ref(false)
async function markAllAnnouncements() {
  markingAllAnnouncement.value = true
  try {
    await markAllAnnouncementsAsRead()
    message.success('已将所有公告标记为已读')
    await notificationStore.loadUnreadCount()
    await loadAnnouncements()
  } catch (error) {
    showUserError(error, '公告批量标记已读失败')
  } finally {
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
    await notificationStore.loadUnreadCount()
    await Promise.all([loadMessages(), loadAnnouncements()])
  } catch (error) {
    showUserError(error, '未读消息批量标记已读失败')
  } finally {
    markingAll.value = false
  }
}

function formatMessageType(type: NotificationTypeEnum): string {
  const map: Record<NotificationTypeEnum, string> = {
    [NotificationTypeEnum.SYSTEM_NOTIFICATION]: '系统通知',
    [NotificationTypeEnum.SYSTEM_ALERT]: '系统告警',
    [NotificationTypeEnum.CLASS_ANNOUNCEMENT]: '班级公告',
    [NotificationTypeEnum.ACCOUNT_SECURITY]: '账号安全',
    [NotificationTypeEnum.TASK_ASSIGNED]: '任务发布',
    [NotificationTypeEnum.TASK_DUE_REMINDER]: '任务到期提醒',
    [NotificationTypeEnum.TASK_OVERDUE]: '任务逾期提醒',
    [NotificationTypeEnum.TASK_REJECTED]: '任务驳回',
    [NotificationTypeEnum.TASK_EXTENDED]: '任务延期',
    [NotificationTypeEnum.AI_GRADING_COMPLETED]: 'AI评分完成',
    [NotificationTypeEnum.DEFENSE_OPENED]: '答辩开启',
    [NotificationTypeEnum.UNSUBMITTED_STUDENTS_ALERT]: '未提交学生提醒',
    [NotificationTypeEnum.PRACTICE_COMPLETION_NOTIFICATION]: '实践完成通知',
    [NotificationTypeEnum.TOKEN_USAGE_ALERT]: 'Token使用预警',
    [NotificationTypeEnum.SCORE_PUBLISHED]: '成绩发布',
    [NotificationTypeEnum.SCORE_RULE_PUBLISHED]: '成绩规则',
    [NotificationTypeEnum.EXAM_SCAN_COMPLETED]: '试卷扫描完成',
    [NotificationTypeEnum.EXAM_REVIEW_PENDING]: '试卷待复核',
    [NotificationTypeEnum.EXAM_SCORE_PUBLISHED]: '试卷成绩发布',
    [NotificationTypeEnum.EXAM_EXPORT_COMPLETED]: '试卷导出完成',
    [NotificationTypeEnum.EXAM_GRADE_REVIEW_UPDATED]: '试卷复核处理',
    [NotificationTypeEnum.QUALITY_AI_TASK_COMPLETED]: '教学质量评价 AI 任务完成',
    [NotificationTypeEnum.QUALITY_AI_TASK_FAILED]: '教学质量评价 AI 任务失败',
    [NotificationTypeEnum.QUALITY_SCORE_IMPORT_COMPLETED]: '教学质量评价成绩导入完成',
    [NotificationTypeEnum.QUALITY_SCORE_IMPORT_FAILED]: '教学质量评价成绩导入失败',
    [NotificationTypeEnum.QUALITY_COURSE_REPORT_REMINDER]: '教学质量评价课程报告提交提醒',
    [NotificationTypeEnum.QUALITY_PROGRAM_REPORT_COMPLETED]: '教学质量评价专业质量报告完成',
    [NotificationTypeEnum.QUALITY_IMPROVEMENT_TASK_ASSIGNED]: '教学质量评价持续改进任务分配',
    [NotificationTypeEnum.QUALITY_IMPROVEMENT_TASK_REVIEW_REMINDER]:
      '教学质量评价持续改进任务复评提醒',
    [NotificationTypeEnum.QUALITY_EXPERT_PACKAGE_EXPORTED]: '教学质量评价专家材料包导出完成',
    [NotificationTypeEnum.QUALITY_ACHIEVEMENT_AUDIT_TRANSITED]: '教学质量评价达成度审核流转',
    [NotificationTypeEnum.RESUBMIT_REQUESTED]: '重新提交申请',
    [NotificationTypeEnum.RESUBMIT_APPROVED]: '重新提交通过',
    [NotificationTypeEnum.RESUBMIT_REJECTED]: '重新提交驳回',
    [NotificationTypeEnum.PORTFOLIO_ARCHIVE_RETURNED]: '档案审核退回',
    [NotificationTypeEnum.PORTFOLIO_ARCHIVE_DISMISSED]: '档案审核驳回',
    [NotificationTypeEnum.PORTFOLIO_TEACHER_ONBOARDING]: '新教师建档',
    [NotificationTypeEnum.PORTFOLIO_GAP_TASK_PENDING]: '档案袋补采任务',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_MATERIAL_CONFIRM]: '评价材料确认',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_RETURNED_SUPPLEMENT]: '评价材料退回',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_MATERIAL_CONFIRMED]: '评价材料已确认',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_PUBLICITY]: '评价结果公示',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_OBJECTION]: '评价异议受理',
    [NotificationTypeEnum.PORTFOLIO_EVALUATION_OBJECTION_HANDLED]: '评价异议复核结论',
    [NotificationTypeEnum.QUALITY_MARK_ASSESSMENT_WEIGHT_MISSING]: '质量评价考核权重缺失',
    [NotificationTypeEnum.MARK_QUALITY_SCORE_SYNC_FAILED]: 'mark 成绩同步失败',
    [NotificationTypeEnum.MARK_ARCHIVE_AUTO_CREATE_FAILED]: '归档卷自动建卷失败',
    [NotificationTypeEnum.MARK_ARCHIVE_DUE_UPCOMING]: '归档时限临近',
    [NotificationTypeEnum.MARK_ARCHIVE_DUE_OVERDUE]: '归档时限逾期',
    [NotificationTypeEnum.MARK_ARCHIVE_RETENTION_REMINDER]: '保管到期鉴定',
    [NotificationTypeEnum.MARK_ARCHIVE_DELAY_SUBMISSION_OVERDUE]: '延迟补交逾期',
    [NotificationTypeEnum.MARK_ARCHIVE_ACCESS_EXPIRED]: '查阅授权到期',
    [NotificationTypeEnum.MARK_ARCHIVE_REMEDIATION_ASSIGNED]: '归档卷整改指派',
    [NotificationTypeEnum.MARK_ARCHIVE_REMEDIATION_RESUBMITTED]: '归档卷整改已重提',
  }
  return map[type]
}

function messageSenderName(senderInfo: UserDto): string {
  return senderInfo.nickName
}

function getPriorityTone(priority?: string): ToneCode {
  if (priority === 'IMPORTANT') return 'red'
  return 'blue'
}

function goJump(url?: string) {
  if (!url) return
  if (/^https?:\/\//i.test(url)) {
    window.open(url, '_blank')
    return
  }
  void router.push(url)
}

// ─── 编排 ──────────────────────────────────
function onTabChange(key: string | number) {
  const next = key as 'inbox' | 'announcement'
  if (next === 'inbox' && messages.value.length === 0) {
    loadMessages(1)
  } else if (next === 'announcement' && announcements.value.length === 0) {
    loadAnnouncements(1)
  }
}

async function reloadAll() {
  lastRefreshAt.value = new Date()
  await Promise.all([
    loadMessages(messagePageState.pageNum),
    loadAnnouncements(announcementPageState.pageNum),
    notificationStore.loadUnreadCount(),
  ])
}

onMounted(async () => {
  lastRefreshAt.value = new Date()
  await Promise.all([loadMessages(1), loadAnnouncements(1), notificationStore.loadUnreadCount()])
})

onActivated(() => {
  void reloadAll()
})
</script>

<style lang="scss" scoped>
.message-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.message-tab__mark-all {
  margin: -4px 0 12px;
}

.msg-list {
  :deep(.ant-list-item) {
    padding: 14px 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-panel, 6px);
    margin-bottom: 10px;
    transition:
      border-color 0.2s ease,
      background 0.2s ease;
  }

  :deep(.ant-list-item:last-child) {
    margin-bottom: 0;
  }
}

.msg-item {
  &--unread {
    :deep(.ant-list-item) {
      border-color: var(--ant-color-primary-border);
      border-left: 3px solid var(--ant-color-primary);
      background: var(--dp-blue-50);
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
