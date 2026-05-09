<template>
  <a-card :bordered="false" size="small">
    <template #title>
      <a-space>
        <span>IQA 指标与阻断页</span>
        <a-tag color="red">阻断 {{ blockedCount }}</a-tag>
      </a-space>
    </template>
    <template #extra>
      <a-space>
        <a-checkbox v-model:checked="blockedOnly" @change="reload">仅看阻断</a-checkbox>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>
    <a-table
      :columns="columns" :data-source="metrics" :loading="loading"
      :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }" row-key="id" size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'overallPass'">
          <a-tag v-if="record.overallPass" color="green">通过</a-tag>
          <a-tag v-else color="red">阻断</a-tag>
        </template>
        <template v-else-if="column.key === 'metrics'">
          DPI {{ record.dpi ?? '-' }} / 模糊 {{ fmt(record.blurScore) }} / 倾斜 {{ fmt(record.skewAngle) }}°
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="link" size="small" :disabled="!record.pageId"
              @click="$emit('repair', String(record.pageId))"
            >
              提交修复
            </a-button>
            <a-button
              type="link" size="small" :disabled="!record.pageId"
              @click="$emit('override', { targetType: 'PAGE', targetId: String(record.pageId) })"
            >
              质检覆盖
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamImageQualityMetricVO, OverrideTargetType } from '@/apis/mark/image-ledger'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { listQualityMetrics } from '@/apis/mark/image-ledger'

defineOptions({ name: 'QualityMetricsCard' })

const props = defineProps<{ examId: string }>()
defineEmits<{
  (e: 'repair', pageId: string): void
  (e: 'override', payload: { targetType: OverrideTargetType, targetId: string }): void
}>()

const metrics = ref<ExamImageQualityMetricVO[]>([])
const loading = ref(false)
const blockedOnly = ref(false)

const columns: ColumnType<ExamImageQualityMetricVO>[] = [
  { title: '页ID', dataIndex: 'pageId', key: 'pageId', width: 140 },
  { title: '批次', dataIndex: 'batchId', key: 'batchId', width: 140 },
  { title: '通过', key: 'overallPass', width: 80 },
  { title: '指标', key: 'metrics', ellipsis: true },
  { title: '诊断', dataIndex: 'diagnostic', key: 'diagnostic', ellipsis: true },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const blockedCount = computed(() => metrics.value.filter(m => m.overallPass === false).length)

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    metrics.value = await listQualityMetrics({ examId: props.examId, blockedOnly: blockedOnly.value })
  } catch (e) {
    metrics.value = []
    message.error(e instanceof Error ? e.message : 'IQA 指标加载失败')
  } finally {
    loading.value = false
  }
}

function fmt(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

watch(() => props.examId, () => {
  void reload()
}, { immediate: true })
</script>
