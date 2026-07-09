<template>
  <section v-if="visible" class="scan-batch-workbench-attention">
    <div class="scan-batch-workbench-attention__head">
      <h3 class="scan-batch-workbench-attention__title">
        批次扫描异常
        <span v-if="total > 0" class="scan-batch-workbench-attention__count">{{ total }} 项</span>
      </h3>
      <UiButton size="sm" variant="ghost" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </UiButton>
    </div>
    <div v-show="expanded">
      <a-spin :spinning="loading">
        <UiEmpty v-if="!loading && items.length === 0" description="该批次暂无扫描异常" />
        <ul v-else class="scan-batch-workbench-attention__list">
          <li
            v-for="item in items"
            :key="item.id"
            class="scan-batch-workbench-attention__item"
            :class="{ 'scan-batch-workbench-attention__item--clickable': Boolean(item.pageId) }"
            @click="handleSelect(item)"
          >
            <div class="scan-batch-workbench-attention__item-head">
              <UiTag
                :tone="strictEnumTone(SCAN_ATTENTION_TYPE_TONE, item.attentionType, '扫描异常类型')"
                size="sm"
              >
                {{
                  strictEnumLabel(
                    ScanAttentionTypeDescription,
                    item.attentionType,
                    '扫描异常类型',
                  )
                }}
              </UiTag>
              <span class="scan-batch-workbench-attention__source">{{ item.sourceDisplayName }}</span>
              <span v-if="item.pageDisplayName" class="scan-batch-workbench-attention__page">
                {{ item.pageDisplayName }}
              </span>
            </div>
            <p v-if="item.diagnostic" class="scan-batch-workbench-attention__diagnostic">
              {{ item.diagnostic }}
            </p>
          </li>
        </ul>
        <div v-if="total > pageSize" class="scan-batch-workbench-attention__pager">
          <a-pagination
            v-model:current="pageNum"
            v-model:page-size="pageSize"
            :total="total"
            size="small"
            show-size-changer
            :page-size-options="['5', '10', '20']"
            @change="loadAttentions"
          />
        </div>
      </a-spin>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { ScanAttentionItemResponse } from '@/apis/mark/exam-scan'
import { computed, ref, watch } from 'vue'
import {
  listScanAttentions,
  SCAN_ATTENTION_TYPE_TONE,
  ScanAttentionTypeDescription,
} from '@/apis/mark/exam-scan'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ScanBatchWorkbenchAttentionPanel' })

const props = defineProps<{
  examId?: string
  scanBatchId?: string
  attentionCount?: number
}>()

const emit = defineEmits<{
  'select-page': [pageId: string]
}>()

const expanded = ref(true)
const loading = ref(false)
const items = ref<ScanAttentionItemResponse[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(5)

const visible = computed(() => (props.attentionCount ?? 0) > 0)

async function loadAttentions(): Promise<void> {
  if (!props.examId || !props.scanBatchId) {
    items.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const result = await listScanAttentions({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    items.value = result.list
    total.value = result.total
  } catch (error) {
    items.value = []
    total.value = 0
    showUserError(error, '批次异常列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSelect(item: ScanAttentionItemResponse): void {
  if (!item.pageId) {
    return
  }
  emit('select-page', item.pageId)
}

watch(
  () => [props.examId, props.scanBatchId, props.attentionCount] as const,
  () => {
    pageNum.value = 1
    if (visible.value) {
      void loadAttentions()
    } else {
      items.value = []
      total.value = 0
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.scan-batch-workbench-attention {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
}

.scan-batch-workbench-attention__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scan-batch-workbench-attention__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.scan-batch-workbench-attention__count {
  margin-left: 8px;
  color: var(--ant-color-error);
  font-size: 12px;
  font-weight: 500;
}

.scan-batch-workbench-attention__list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.scan-batch-workbench-attention__item {
  padding: 10px 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);

  &--clickable {
    cursor: pointer;

    &:hover {
      background: var(--ant-color-fill-quaternary);
    }
  }

  &:last-child {
    border-bottom: none;
  }
}

.scan-batch-workbench-attention__item-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.scan-batch-workbench-attention__source,
.scan-batch-workbench-attention__page {
  color: var(--ant-color-text-secondary);
  font-size: 13px;
}

.scan-batch-workbench-attention__diagnostic {
  margin: 8px 0 0;
  color: var(--ant-color-text);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.scan-batch-workbench-attention__pager {
  margin-top: 8px;
  text-align: right;
}
</style>
