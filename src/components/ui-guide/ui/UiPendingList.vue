<template>
  <div class="dp-pending-card">
    <a-spin :spinning="loading" style="width: 100%;">
      <div
        v-if="items.length"
        ref="scrollContainerRef"
        class="dp-pending-list"
        :class="{ 'dp-pending-list--scrollable': shouldScroll }"
        @mouseenter="pauseScroll"
        @mouseleave="resumeScroll"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="dp-pending-item"
          @click="handleClick(item)"
        >
          <GiCellAvatar
            class="dp-pending-avatar"
            :name="item.studentName"
            :size="36"
            :show-name="false"
          />
          <div class="dp-pending-content">
            <div class="dp-pending-top">
              <span class="dp-pending-name">{{ item.studentName }}</span>
              <span class="dp-pending-time">{{ item.time }}</span>
            </div>
            <div class="dp-pending-desc-row">
              <div class="dp-pending-desc">{{ item.practiceName }}</div>
              <div class="dp-pending-tag" :class="getToneClass(item)">{{ item.taskType }}</div>
            </div>
          </div>
        </div>
      </div>
      <a-empty v-else :description="emptyText" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import GiCellAvatar from '@/components/GiCell/GiCellAvatar.vue'

export interface PendingListItem {
  id: string
  studentName: string
  taskType: string
  practiceName: string
  time: string
  aiScore?: number | string
  score?: number | string
  tone?: 'orange' | 'blue' | 'red' | 'gray'
}

const props = withDefaults(defineProps<{
  items: PendingListItem[]
  loading?: boolean
  emptyText?: string
  /** 最大可见条数，超过后自动滚动 */
  maxVisible?: number
  /** 滚动速度（毫秒/像素） */
  scrollSpeed?: number
}>(), {
  maxVisible: 5,
  scrollSpeed: 50
})

const emit = defineEmits<{
  'item-click': [item: PendingListItem]
}>()

// 滚动相关
const scrollContainerRef = ref<HTMLElement | null>(null)
const isPaused = ref(false)
let scrollTimer: ReturnType<typeof setInterval> | null = null

// 是否需要滚动
const shouldScroll = computed(() => props.items.length > props.maxVisible)

// 开始自动滚动
const startScroll = () => {
  if (!shouldScroll.value || !scrollContainerRef.value) return

  scrollTimer = setInterval(() => {
    if (isPaused.value || !scrollContainerRef.value) return

    const container = scrollContainerRef.value
    const maxScroll = container.scrollHeight - container.clientHeight

    if (container.scrollTop >= maxScroll) {
      // 滚动到底部，回到顶部
      container.scrollTop = 0
    } else {
      // 每次滚动1像素
      container.scrollTop += 1
    }
  }, props.scrollSpeed)
}

// 停止滚动
const stopScroll = () => {
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
}

// 鼠标悬停暂停
const pauseScroll = () => {
  isPaused.value = true
}

// 鼠标离开继续
const resumeScroll = () => {
  isPaused.value = false
}

const emptyText = computed(() => props.emptyText || '暂无待处理任务')

const getTone = (item: PendingListItem) => {
  if (item.tone) return item.tone
  switch (item.taskType) {
    case '待评分':
      return 'orange'
    case '待答辩':
      return 'blue'
    case '待沟通':
      return 'red'
    default:
      return 'gray'
  }
}

const getToneClass = (item: PendingListItem) => {
  const tone = getTone(item)
  return {
    'tone-orange': tone === 'orange',
    'tone-blue': tone === 'blue',
    'tone-red': tone === 'red',
    'tone-gray': tone === 'gray',
  }
}

const handleClick = (item: PendingListItem) => {
  emit('item-click', item)
}

// 监听数据变化，重新启动滚动
watch(() => props.items.length, (newLen) => {
  stopScroll()
  if (newLen > props.maxVisible) {
    // 等待 DOM 更新后再启动滚动
    setTimeout(() => {
      startScroll()
    }, 100)
  }
}, {immediate: true})

onBeforeUnmount(() => {
  stopScroll()
})
</script>

<style scoped>
.dp-pending-card {
  width: 100%;
}

.dp-pending-list {
  display: grid;
  gap: 8px;
}

/* 超过最大可见条数时启用滚动 */
.dp-pending-list--scrollable {
  max-height: 420px; /* 约5条的高度 */
  overflow-y: auto;
  padding-right: 4px;

  /* 自定义滚动条样式 */

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: var(--ant-border-radius-xs);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--ant-color-border-secondary);
    border-radius: var(--ant-border-radius-xs);
    transition: background 0.2s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--ant-color-border);
  }

  /* Firefox 滚动条 */
  scrollbar-width: thin;
  scrollbar-color: var(--ant-color-border-secondary) transparent;
}

.dp-pending-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--ant-color-border);
  transition: background-color 0.16s ease;
  cursor: pointer;
}

.dp-pending-item:last-child {
  border-bottom: none;
}

.dp-pending-item:hover {
  background: var(--ant-color-fill-tertiary);
  margin: 0 -8px;
  padding: 12px 8px;
  border-radius: var(--dp-radius-panel);
}

.dp-pending-content {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.dp-pending-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.dp-pending-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.dp-pending-desc {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-pending-desc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dp-pending-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dp-radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.dp-pending-tag.tone-orange {
  background: var(--ant-color-warning-bg);
  color: var(--ant-color-warning);
}

.dp-pending-tag.tone-blue {
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
}

.dp-pending-tag.tone-red {
  background: var(--ant-color-error-bg);
  color: var(--ant-color-error);
}

.dp-pending-tag.tone-gray {
  background: var(--ant-color-fill-secondary);
  color: var(--ant-color-text-secondary);
}
</style>
