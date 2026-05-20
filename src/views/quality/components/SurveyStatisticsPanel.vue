<template>
  <a-modal
    v-model:open="visible"
    title="问卷统计分析"
    :width="800"
    :footer="null"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <template v-if="statistics">
        <!-- 总体概览 -->
        <div class="stats-overview">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-statistic title="总样本数" :value="statistics.overallSampleCount" />
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="总体达成度"
                :value="statistics.overallScore != null ? (statistics.overallScore * 100).toFixed(1) : '-'"
                suffix="%"
              />
            </a-col>
            <a-col :span="8">
              <a-statistic title="题项数" :value="statistics.items.length" />
            </a-col>
          </a-row>
        </div>

        <!-- 各题项统计 -->
        <a-table
          :columns="columns"
          :data-source="statistics.items"
          :pagination="false"
          row-key="itemId"
          size="small"
          class="stats-table"
          :scroll="{ x: 700 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'mean'">
              {{ record.mean != null ? record.mean.toFixed(2) : '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'median'">
              {{ record.median != null ? record.median.toFixed(2) : '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'stdDev'">
              {{ record.stdDev != null ? record.stdDev.toFixed(2) : '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'convertedScore'">
              <span :class="scoreClass(record.convertedScore)">
                {{ record.convertedScore != null ? `${(record.convertedScore * 100).toFixed(1)}%` : '-' }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'distribution'">
              <div v-if="record.distribution" class="distribution-bar">
                <span
                  v-for="(count, val) in record.distribution"
                  :key="val"
                  class="distribution-item"
                  :title="`${val}: ${count}人`"
                >
                  {{ val }}({{ count }})
                </span>
              </div>
              <span v-else>-</span>
            </template>
          </template>
        </a-table>
      </template>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import type { IndirectEvaluationStatisticsVO } from '@/apis/quality/indirect-evaluation'
import { computed, ref, watch } from 'vue'
import { indirectFormApi } from '@/apis/quality/indirect-evaluation'

const props = defineProps<{
  open: boolean
  formId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const loading = ref(false)
const statistics = ref<IndirectEvaluationStatisticsVO | null>(null)

const columns = [
  { title: '编码', dataIndex: 'itemCode', width: 80 },
  { title: '题干', dataIndex: 'itemText', ellipsis: true, width: 180 },
  { title: '样本', dataIndex: 'sampleCount', width: 60 },
  { title: '有效', dataIndex: 'validCount', width: 60 },
  { title: '均值', dataIndex: 'mean', width: 70 },
  { title: '中位数', dataIndex: 'median', width: 70 },
  { title: '标准差', dataIndex: 'stdDev', width: 70 },
  { title: '达成度', dataIndex: 'convertedScore', width: 80 },
  { title: '分布', dataIndex: 'distribution', width: 160 },
]

watch(() => ({ open: props.open, formId: props.formId }), async ({ open, formId }) => {
  if (open && formId) {
    loading.value = true
    try {
      statistics.value = await indirectFormApi.statistics(formId)
    } catch {
      statistics.value = null
    } finally {
      loading.value = false
    }
  }
}, { immediate: true })

function scoreClass(score?: number): string {
  if (score == null) return ''
  if (score >= 0.7) return 'score-good'
  if (score >= 0.5) return 'score-warn'
  return 'score-low'
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.stats-overview {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.stats-table {
  margin-top: 16px;
}

.distribution-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.distribution-item {
  font-size: 12px;
  padding: 1px 6px;
  background: #f0f5ff;
  border-radius: 4px;
  color: #1890ff;
}

.score-good { color: #52c41a; font-weight: 600; }
.score-warn { color: #faad14; font-weight: 600; }
.score-low { color: #ff4d4f; font-weight: 600; }
</style>
