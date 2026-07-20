<template>
  <div class="scan-batch-page-rail" :class="{ 'scan-batch-page-rail--strip': isStrip }">
    <div v-if="$slots.header" class="scan-batch-page-rail__header">
      <slot name="header" />
    </div>
    <UiSpin :spinning="loading">
      <UiEmpty
        size="sm"
        v-if="!loading && pageItems.length === 0"
        :description="emptyDescription"
        class="scan-batch-page-rail__empty"
      />
      <div
        v-else-if="isStrip"
        ref="stripRef"
        class="scan-batch-page-rail__strip"
        @scroll="onStripScroll"
      >
        <button
          v-for="item in pageItems"
          :key="item.pageKey"
          type="button"
          class="scan-batch-page-rail__chip"
          :data-page-key="item.pageKey"
          :class="{
            'scan-batch-page-rail__chip--active': item.pageKey === selectedPageKey,
            [`scan-batch-page-rail__chip--${resolveRailTone(item)}`]: true,
          }"
          @click="emit('select', item.pageKey)"
        >
          <span class="scan-batch-page-rail__chip-order">#{{ item.fileOrder }}</span>
          <span class="scan-batch-page-rail__chip-label">{{ rowPrimaryLabel(item) }}</span>
          <span v-if="rowSecondaryLabel(item)" class="scan-batch-page-rail__chip-meta">
            {{ rowSecondaryLabel(item) }}
          </span>
          <span v-if="item.hasException" class="scan-batch-page-rail__badge">
            {{ (item.attentionCount ?? 0) > 0 ? item.attentionCount : '!' }}
          </span>
        </button>
        <div v-if="loadingMore" class="scan-batch-page-rail__loading-more">加载更多…</div>
      </div>
      <div v-else class="scan-batch-page-rail__scroller">
        <UiList
          :data-source="pageItems"
          :split="false"
          :virtual="true"
          :height="listHeight"
          :virtual-list-props="virtualListProps"
          class="scan-batch-page-rail__list"
        >
          <template #renderItem="{ item }">
            <button
              type="button"
              class="scan-batch-page-rail__row"
              :class="{
                'scan-batch-page-rail__row--active': item.pageKey === selectedPageKey,
                [`scan-batch-page-rail__row--${resolveRailTone(item)}`]: true,
              }"
              @click="emit('select', item.pageKey)"
            >
              <span
                class="scan-batch-page-rail__bar"
                :class="`scan-batch-page-rail__bar--${resolveRailTone(item)}`"
              />
              <span class="scan-batch-page-rail__body">
                <span class="scan-batch-page-rail__order">#{{ item.fileOrder }}</span>
                <span class="scan-batch-page-rail__label">{{ rowPrimaryLabel(item) }}</span>
                <span v-if="rowSecondaryLabel(item)" class="scan-batch-page-rail__meta">
                  {{ rowSecondaryLabel(item) }}
                </span>
              </span>
              <span v-if="item.hasException" class="scan-batch-page-rail__badge">
                {{ (item.attentionCount ?? 0) > 0 ? item.attentionCount : '!' }}
              </span>
            </button>
          </template>
        </UiList>
        <div v-if="loadingMore" class="scan-batch-page-rail__loading-more">加载更多页轨…</div>
      </div>
    </UiSpin>
  </div>
</template>

<script lang="ts" setup>
import type { ExamScannerBatchWorkbenchPageVO } from '@/apis/mark/exam-scan'
import {
  ScanBatchWorkbenchRegisterStatusCode,
  ScanBatchWorkbenchRegisterStatusDescription,
} from '@/apis/mark/exam-scan'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { ScanBatchWorkbenchBindingStatusCode } from '@/types/enums/scan-batch-workbench-binding-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ScanBatchPageRail' })

const props = withDefaults(
  defineProps<{
    pageItems: ExamScannerBatchWorkbenchPageVO[]
    selectedPageKey?: string
    loading?: boolean
    loadingMore?: boolean
    emptyDescription?: string
    /** rail=侧栏竖列表；strip=顶部品带，配合上列表下影像布局 */
    layout?: 'rail' | 'strip'
  }>(),
  {
    selectedPageKey: '',
    loading: false,
    loadingMore: false,
    emptyDescription: '暂无页轨数据',
    layout: 'rail',
  },
)

const emit = defineEmits<{
  select: [pageKey: string]
  'reach-end': []
}>()

const isStrip = computed(() => props.layout === 'strip')
const stripRef = ref<HTMLElement | null>(null)

const listHeight = ref(480)
const virtualListProps = {
  itemHeight: 72,
  itemKey: 'pageKey',
  onScroll: (event: Event) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
      emit('reach-end')
    }
  },
}

type RailTone = 'pending' | 'registered' | 'bound' | 'exception' | 'superseded'

function resolveRailTone(item: ExamScannerBatchWorkbenchPageVO): RailTone {
  if (item.hasException || item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.CONFLICT) {
    return 'exception'
  }
  if (item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.SUPERSEDED) {
    return 'superseded'
  }
  if (item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING) {
    return 'pending'
  }
  if (item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return 'bound'
  }
  return 'registered'
}

function rowPrimaryLabel(item: ExamScannerBatchWorkbenchPageVO): string {
  if (item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING) {
    return strictEnumLabel(
      ScanBatchWorkbenchRegisterStatusDescription,
      ScanBatchWorkbenchRegisterStatusCode.PENDING,
      '扫描页登记状态',
    )
  }
  if (item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND && item.candidateName) {
    return item.candidateName
  }
  if (item.pageSeq !== undefined && item.pageSeq !== null) {
    return `第 ${item.pageSeq} 页`
  }
  return strictEnumLabel(
    ScanBatchWorkbenchRegisterStatusDescription,
    item.registerStatus,
    '扫描页登记状态',
  )
}

function formatOcrIdentityHint(item: ExamScannerBatchWorkbenchPageVO): string {
  const parts: string[] = []
  if (item.ocrStudentNo) {
    parts.push(item.ocrStudentNo)
  }
  if (item.ocrStudentName) {
    parts.push(item.ocrStudentName)
  }
  if (item.ocrClassName) {
    parts.push(item.ocrClassName)
  }
  return parts.join(' · ')
}

function rowSecondaryLabel(item: ExamScannerBatchWorkbenchPageVO): string {
  if (item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND && item.studentNo) {
    return item.studentNo
  }
  if (
    item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED &&
    item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.CONFLICT
  ) {
    return '绑定冲突'
  }
  if (
    item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED &&
    item.bindingStatus === ScanBatchWorkbenchBindingStatusCode.UNBOUND
  ) {
    const ocrHint = formatOcrIdentityHint(item)
    if (ocrHint) {
      return `文字识别 ${ocrHint}`
    }
    return '待绑定'
  }
  if (
    item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED &&
    item.hasException
  ) {
    const ocrHint = formatOcrIdentityHint(item)
    if (ocrHint) {
      return `文字识别 ${ocrHint}`
    }
  }
  if (item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.SUPERSEDED) {
    return '已替换'
  }
  return ''
}

function onStripScroll(event: Event): void {
  const target = event.target as HTMLElement | null
  if (!target) {
    return
  }
  if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 48) {
    emit('reach-end')
  }
}

function syncListHeight(): void {
  if (isStrip.value) {
    return
  }
  listHeight.value = Math.max(window.innerHeight - 180, 320)
}

onMounted(() => {
  syncListHeight()
  window.addEventListener('resize', syncListHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncListHeight)
})

watch(
  () => [props.pageItems.length, props.layout] as const,
  () => {
    syncListHeight()
  },
)

watch(
  () => props.selectedPageKey,
  (pageKey) => {
    if (!isStrip.value || !pageKey || !stripRef.value) {
      return
    }
    const chip = stripRef.value.querySelector(
      `.scan-batch-page-rail__chip[data-page-key="${CSS.escape(pageKey)}"]`,
    ) as HTMLElement | null
    chip?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  },
)
</script>

<style lang="scss" scoped>
.scan-batch-page-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.scan-batch-page-rail--strip {
  height: auto;
}

.scan-batch-page-rail__header {
  flex-shrink: 0;
  padding: 8px 12px 0;
}

.scan-batch-page-rail__strip {
  display: flex;
  gap: 8px;
  align-items: stretch;
  overflow-x: auto;
  padding: 8px 12px 12px;
  scroll-snap-type: x proximity;
}

.scan-batch-page-rail__chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  width: 148px;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  border-left-width: 4px;
  background: var(--dp-bg-container);
  text-align: left;
  cursor: pointer;
  scroll-snap-align: start;

  &--active {
    background: var(--dp-blue-50);
    border-color: var(--dp-color-primary);
  }

  &--pending {
    border-left-color: var(--dp-text-muted);
  }

  &--registered {
    border-left-color: var(--dp-color-primary);
  }

  &--bound {
    border-left-color: var(--dp-success);
  }

  &--exception {
    border-left-color: var(--dp-danger);
  }

  &--superseded {
    opacity: 0.5;
    border-left-color: var(--dp-text-muted);
  }
}

.scan-batch-page-rail__chip-order {
  color: var(--dp-text-muted);
  font-size: 12px;
}

.scan-batch-page-rail__chip-label {
  overflow: hidden;
  color: var(--dp-text-primary);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__chip-meta {
  overflow: hidden;
  color: var(--dp-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__scroller {
  height: calc(100vh - 180px);
  min-height: 240px;
}

.scan-batch-page-rail__list {
  height: 100%;
}

.scan-batch-page-rail__row {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 72px;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--dp-border-subtle);
  background: transparent;
  text-align: left;
  cursor: pointer;

  &--active {
    background: var(--dp-blue-50);
  }

  &--superseded {
    opacity: 0.5;
  }
}

.scan-batch-page-rail__bar {
  flex-shrink: 0;
  width: 4px;

  &--pending {
    background: var(--dp-text-muted);
  }

  &--registered {
    background: var(--dp-color-primary);
  }

  &--bound {
    background: var(--dp-success);
  }

  &--exception {
    background: var(--dp-danger);
  }

  &--superseded {
    background: var(--dp-text-muted);
  }
}

.scan-batch-page-rail__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 10px 12px;
}

.scan-batch-page-rail__order {
  color: var(--dp-text-muted);
  font-size: 12px;
}

.scan-batch-page-rail__label {
  overflow: hidden;
  color: var(--dp-text-primary);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__meta {
  overflow: hidden;
  color: var(--dp-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__badge {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--dp-error-bg);
  color: var(--dp-danger);
  font-size: 12px;
  line-height: 20px;
}

.scan-batch-page-rail__row .scan-batch-page-rail__badge {
  align-self: center;
  margin-right: 12px;
  margin-top: 0;
}

.scan-batch-page-rail__loading-more {
  flex-shrink: 0;
  align-self: center;
  padding: 8px 12px;
  color: var(--dp-text-muted);
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.scan-batch-page-rail__empty {
  padding: var(--dp-space-3, 12px);
}
</style>
