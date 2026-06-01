<template>
  <a-modal
    v-model:open="visible"
    :footer="null"
    :mask-closable="true"
    :title="currentNotice?.title"
    :width="800"
    @cancel="onClose"
  >
    <div class="detail">
      <div class="detail_content">
        <div class="info">
          <a-space>
            <span>
              <UserOutlined class="icon" />
              <span class="label">创建者：</span>
              <span>{{ currentNotice?.createUserName }}</span>
            </span>
            <a-divider type="vertical" />
            <span>
              <HistoryOutlined class="icon" />
              <span class="label">创建时间：</span>
              <span>{{ currentNotice?.publishTime }}</span>
            </span>
            <a-divider v-if="currentNotice?.updateTime" type="vertical" />
            <span v-if="currentNotice?.updateTime">
              <ScheduleOutlined class="icon" />
              <span>更新时间：</span>
              <span>{{ currentNotice?.updateTime }}</span>
            </span>
          </a-space>
        </div>
        <div style="flex: 1">
          <div v-if="contentLoading" class="content-loading">
            <a-spin size="large" />
          </div>
          <!-- 优化：只有在有内容且弹窗可见时才渲染AI编辑器 -->
          <AiEditor
            v-else-if="visible && currentNoticeContent"
            v-model="currentNoticeContent"
            :editable="false"
          />
          <div v-else class="no-content">暂无内容</div>
        </div>
      </div>

      <!-- 底部操作区域 -->
      <div class="notice-footer">
        <div class="notice-actions">
          <span v-if="unreadNoticeIds.length > 1" class="pagination-info">
            {{ currentIndex + 1 }} / {{ unreadNoticeIds.length }}
          </span>
          <span v-else class="pagination-info"></span>

          <!-- 翻页和关闭按钮 -->
          <div class="pagination-controls">
            <a-space>
              <a-button v-if="currentIndex > 0" @click="previousNotice"> 上一篇 </a-button>
              <a-button v-if="currentIndex < unreadNoticeIds.length - 1" @click="nextNotice">
                下一篇
              </a-button>
              <a-button type="primary" @click="onClose"> 关闭 </a-button>
            </a-space>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import type { PublishedSystemAnnouncementResponse } from '@/apis/edu/message'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import ScheduleOutlined from '@ant-design/icons-vue/ScheduleOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { computed, ref, watch } from 'vue'
import {
  AnnouncementStatusEnum,
  getPublishedAnnouncementDetail,
  getPublishedAnnouncementList,
} from '@/apis/edu/message'
import AiEditor from '@/components/AiEditor/index.vue'
import { showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'

defineOptions({ name: 'NoticePopup' })

// 接收props
const props = defineProps<{
  noticeId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
const unreadNoticeIds = ref<string[]>([])
const currentIndex = ref(0)
const loading = ref(false)
const contentLoading = ref(false)
const noticeCache = ref<Map<string, PublishedSystemAnnouncementResponse>>(new Map())

const currentNotice = computed(() => {
  const noticeId = unreadNoticeIds.value[currentIndex.value]
  return noticeId ? noticeCache.value.get(noticeId) : null
})

// 优化：使用ref而不是computed，避免频繁的响应式更新
const currentNoticeContent = ref('')

// 监听currentNotice变化，手动更新内容
watch(
  currentNotice,
  (newNotice) => {
    if (newNotice) {
      currentNoticeContent.value = newNotice.content
    } else {
      currentNoticeContent.value = ''
    }
  },
  { immediate: true },
)

// 获取公告详情
const fetchNoticeDetail = async (index: number) => {
  const noticeId = unreadNoticeIds.value[index]
  if (!noticeId) {
    return
  }

  // 如果已经缓存了该公告，直接设置当前索引并返回
  if (noticeCache.value.has(noticeId)) {
    currentIndex.value = index
    return
  }

  contentLoading.value = true
  try {
    // 使用用户端API获取公告详情，后端会自动记录阅读
    const data = await getPublishedAnnouncementDetail(noticeId)
    noticeCache.value.set(noticeId, data)
    currentIndex.value = index
    // 触发刷新未读计数事件
    mittBus.emit('count-refresh')
  } catch (error) {
    showUserError(error, '公告详情加载失败，请稍后重试')
  } finally {
    contentLoading.value = false
  }
}

// 获取未读公告列表或单个公告
const fetchUnreadNotices = async () => {
  loading.value = true
  try {
    // 如果传入了noticeId，直接获取该公告详情
    if (props.noticeId) {
      unreadNoticeIds.value = [props.noticeId]
      visible.value = true
      await fetchNoticeDetail(0)
      currentIndex.value = 0
      return
    }

    // 使用用户端公告列表API查询未读的已发布公告
    const data = await getPublishedAnnouncementList({
      status: AnnouncementStatusEnum.PUBLISHED,
      unreadOnly: true,
      pageNum: 1,
      pageSize: 10,
    })

    if (data && data.list && data.list.length > 0) {
      unreadNoticeIds.value = data.list.map((item) => item.id)
      visible.value = true
      // 获取第一篇公告的详情
      await fetchNoticeDetail(0)
      currentIndex.value = 0
    }
  } catch (error) {
    showUserError(error, '未读公告加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 上一条公告
const previousNotice = () => {
  if (currentIndex.value > 0) {
    const newIndex = currentIndex.value - 1
    fetchNoticeDetail(newIndex)
  }
}

// 下一条公告
const nextNotice = () => {
  if (currentIndex.value < unreadNoticeIds.value.length - 1) {
    const newIndex = currentIndex.value + 1
    fetchNoticeDetail(newIndex)
  }
}

// 关闭弹窗
const onClose = () => {
  visible.value = false
  currentIndex.value = 0
  unreadNoticeIds.value = []
  noticeCache.value.clear()
  // 优化：清空编辑器内容，避免遗留数据
  currentNoticeContent.value = ''
  emit('close')
}

// 打开弹窗
const open = () => {
  fetchUnreadNotices()
}

defineExpose({
  open,
})
</script>

<style lang="scss" scoped>
.detail {
  .detail_content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0; // 减小内边距
    margin: 0;

    .info {
      margin-bottom: 12px; // 减小信息区域下边距
      color: var(--ant-color-text-secondary);
      font-size: 14px;
      line-height: 1.5715;
      text-align: center;

      .icon {
        margin-right: 4px;
      }
    }
  }

  .notice-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--ant-color-border-secondary);

    .notice-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .pagination-info {
        font-size: 14px;
        color: var(--ant-color-text-secondary);
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }
  }
}

.content-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.no-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--ant-color-text-tertiary);
  font-size: 14px;
}

// 兼容原有样式
.notice-content {
  .notice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--ant-color-border-secondary);

    .notice-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .notice-time {
        font-size: 12px;
        color: var(--ant-color-text-tertiary);
      }
    }
  }

  .notice-body {
    margin-bottom: 24px;

    .notice-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--ant-color-text);
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .notice-text {
      font-size: 14px;
      color: var(--ant-color-text-secondary);
      line-height: 1.6;
      max-height: 300px;
      overflow-y: auto;

      :deep(img) {
        max-width: 100%;
        height: auto;
      }

      :deep(p) {
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.notice-loading {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
