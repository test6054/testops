<template>
  <div class="scan-batch-page-rail">
    <div v-if="$slots.header" class="scan-batch-page-rail__header">
      <slot name="header" />
    </div>
    <a-spin :spinning="loading">
      <UiEmpty
        v-if="!loading && pageItems.length === 0"
        :description="emptyDescription"
        class="scan-batch-page-rail__empty"
      />
      <div v-else class="scan-batch-page-rail__scroller">
        <a-list
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
        </a-list>
      </div>
      <div v-if="loadingMore" class="scan-batch-page-rail__loading-more">加载更多页轨…</div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { ExamScannerBatchWorkbenchPageVO } from '@/apis/mark/exam-scan'
import {
  ScanBatchWorkbenchRegisterStatusCode,
  ScanBatchWorkbenchRegisterStatusDescription,
} from '@/apis/mark/exam-scan'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
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
  }>(),
  {
    selectedPageKey: '',
    loading: false,
    loadingMore: false,
    emptyDescription: '暂无页轨数据',
  },
)

const emit = defineEmits<{
  select: [pageKey: string]
  'reach-end': []
}>()

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
      return `OCR ${ocrHint}`
    }
    return '待绑定'
  }
  if (
    item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED &&
    item.hasException
  ) {
    const ocrHint = formatOcrIdentityHint(item)
    if (ocrHint) {
      return `OCR ${ocrHint}`
    }
  }
  if (item.registerStatus === ScanBatchWorkbenchRegisterStatusCode.SUPERSEDED) {
    return '已替换'
  }
  return ''
}

function syncListHeight(): void {
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
  () => props.pageItems.length,
  () => {
    syncListHeight()
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

.scan-batch-page-rail__header {
  flex-shrink: 0;
  padding: 0 12px 8px;
}

.scan-batch-page-rail__scroller {
  height: calc(100vh - 180px);
  min-height: 320px;
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
  border-bottom: 1px solid var(--ant-color-border-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;

  &--active {
    background: var(--ant-color-primary-bg);
  }

  &--superseded {
    opacity: 0.5;
  }
}

.scan-batch-page-rail__bar {
  flex-shrink: 0;
  width: 4px;

  &--pending {
    background: var(--ant-color-text-quaternary);
  }

  &--registered {
    background: var(--ant-color-primary);
  }

  &--bound {
    background: var(--ant-color-success);
  }

  &--exception {
    background: var(--ant-color-error);
  }

  &--superseded {
    background: var(--ant-color-text-quaternary);
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
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
}

.scan-batch-page-rail__label {
  overflow: hidden;
  color: var(--ant-color-text);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__meta {
  overflow: hidden;
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-rail__badge {
  flex-shrink: 0;
  align-self: center;
  margin-right: 12px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--ant-color-error-bg);
  color: var(--ant-color-error);
  font-size: 12px;
  line-height: 20px;
}

.scan-batch-page-rail__loading-more {
  padding: 8px 12px;
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
  text-align: center;
}

.scan-batch-page-rail__empty {
  padding: 24px 12px;
}
</style>
