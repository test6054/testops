<template>
  <div class="dp-warning-card">
    <a-spin :spinning="loading" style="width: 100%">
      <div
        v-if="items.length"
        ref="scrollContainerRef"
        class="dp-warning-list"
        :class="{ 'dp-warning-list--scrollable': shouldScroll }"
        @mouseenter="pauseScroll"
        @mouseleave="resumeScroll"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="dp-warning-item"
          @click="handleClick(item)"
        >
          <GiCellAvatar class="dp-warning-avatar" :name="item.user" :size="36" :show-name="false" />
          <div class="dp-warning-content">
            <div class="dp-warning-top">
              <span class="dp-warning-user">{{ item.user }}</span>
              <span class="dp-warning-time">{{ item.time }}</span>
            </div>
            <div class="dp-warning-desc-row">
              <div class="dp-warning-desc">{{ item.desc }}</div>
              <div
                v-if="item.severity && item.severity !== 'medium'"
                class="dp-warning-chip"
                :style="getSeverityStyle(item.severity)"
              >
                {{ severityLabel[item.severity] || '提醒' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <a-empty v-else :description="emptyText" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { WarningListItem } from './types'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import GiCellAvatar from '@/components/GiCell/GiCellAvatar.vue'

const props = withDefaults(
  defineProps<{
    items: WarningListItem[]
    loading?: boolean
    emptyText?: string
    /** 最大可见条数，超过后自动滚动 */
    maxVisible?: number
    /** 滚动速度（毫秒/像素） */
    scrollSpeed?: number
  }>(),
  {
    maxVisible: 5,
    scrollSpeed: 50,
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: WarningListItem): void
}>()

// 滚动相关
const scrollContainerRef = useTemplateRef<HTMLElement>('scrollContainerRef')
const isPaused = ref(false)
let scrollTimer: ReturnType<typeof setInterval> | null = null

// 是否需要滚动
const shouldScroll = computed(() => props.items.length > props.maxVisible)

// 开始自动滚动
const startScroll = () => {
  if (!shouldScroll.value || !scrollContainerRef.value) return

  scrollTimer = setInterval(() => {
    const container: HTMLElement | null = scrollContainerRef.value
    if (isPaused.value || !container) return

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

const severityLabel: Partial<Record<NonNullable<WarningListItem['severity']>, string>> = {
  high: '高风险',
  low: '提醒',
}

const getSeverityStyle = (severity?: string) => {
  const styles: Record<string, { color: string; background: string }> = {
    high: { color: 'var(--ant-color-error)', background: 'var(--ant-color-error-bg)' },
    medium: { color: 'var(--ant-color-warning)', background: 'var(--ant-color-warning-bg)' },
    low: { color: 'var(--ant-color-success)', background: 'var(--ant-color-success-bg)' },
  }
  return styles[severity || 'low'] || styles.low
}

const emptyText = computed(() => props.emptyText || '暂无预警')

const handleClick = (item: WarningListItem) => {
  emit('item-click', item)
}

// 监听数据变化，重新启动滚动
watch(
  () => props.items.length,
  (newLen) => {
    stopScroll()
    if (newLen > props.maxVisible) {
      // 等待 DOM 更新后再启动滚动
      setTimeout(() => {
        startScroll()
      }, 100)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopScroll()
})
</script>

<style scoped>
.dp-warning-card {
  width: 100%;
}

.dp-warning-list {
  display: grid;
  gap: 8px;
}

/* 超过最大可见条数时启用滚动 */
.dp-warning-list--scrollable {
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

.dp-warning-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--ant-color-border);
  transition: background-color 0.16s ease;
  cursor: pointer;
}

.dp-warning-item:last-child {
  border-bottom: none;
}

.dp-warning-item:hover {
  background: var(--ant-color-fill-tertiary);
  margin: 0 -8px;
  padding: 12px 8px;
  border-radius: var(--dp-radius-panel);
}

.dp-warning-content {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.dp-warning-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.dp-warning-user {
  font-size: 13px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.dp-warning-desc {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-warning-desc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dp-warning-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dp-radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
