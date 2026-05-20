<template>
  <a-modal
    v-model:open="visible"
    title="问卷填写进度"
    :width="480"
    :footer="null"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <template v-if="progress">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="问卷名称">{{ progress.formName }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(progress.status)">{{ statusText(progress.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="已收到提交数">
            <span class="highlight-number">{{ progress.submissionCount }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="期望样本数">{{ progress.expectedSample ?? '未设置' }}</a-descriptions-item>
          <a-descriptions-item v-if="progress.completionRate != null" label="完成率">
            <a-progress :percent="Number(progress.completionRate)" :stroke-color="progressColor(Number(progress.completionRate))" size="small" />
          </a-descriptions-item>
          <a-descriptions-item label="开始时间">{{ progress.startTime ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="截止时间">{{ progress.endTime ?? '-' }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import type { IndirectEvaluationProgressVO } from '@/apis/quality/indirect-evaluation'
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
const progress = ref<IndirectEvaluationProgressVO | null>(null)

watch(() => ({ open: props.open, formId: props.formId }), async ({ open, formId }) => {
  if (open && formId) {
    loading.value = true
    try {
      progress.value = await indirectFormApi.progress(formId)
    } catch {
      progress.value = null
    } finally {
      loading.value = false
    }
  }
}, { immediate: true })

function statusColor(status: string): string {
  const map: Record<string, string> = { DRAFT: 'default', PUBLISHED: 'green', CLOSED: 'orange', ARCHIVED: 'gray' }
  return map[status] || 'default'
}

function statusText(status: string): string {
  const map: Record<string, string> = { DRAFT: '草稿', PUBLISHED: '进行中', CLOSED: '已关闭', ARCHIVED: '已归档' }
  return map[status] || status
}

function progressColor(rate: number): string {
  if (rate >= 80) return '#52c41a'
  if (rate >= 50) return '#1890ff'
  return '#faad14'
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped>
.highlight-number {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}
</style>
