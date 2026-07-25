<script setup lang="ts">
/**
 * 本批次已绑定学生面板：扫描 / 复核 / 历史阶段展示，含学号、姓名、班级、页数。
 */
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const props = withDefaults(
  defineProps<{
    /** rail=侧栏紧凑；panel=主区表格 */
    variant?: 'rail' | 'panel'
    /** 历史等场景显式指定批次 ID，覆盖 workflow 推导值 */
    scanBatchId?: string
  }>(),
  { variant: 'panel' },
)

const { workflow } = useKioskCtx()

const effectiveBatchId = computed(
  () => props.scanBatchId?.trim() || workflow.boundPaperScanBatchId.value,
)

const summaryText = computed(() => {
  const { studentCount, totalPages } = workflow.boundPaperSummary.value
  if (studentCount === 0) return '暂无已绑定学生'
  return `${studentCount} 人 · 共 ${totalPages} 页`
})

function refresh() {
  const batchId = effectiveBatchId.value
  if (!batchId) return
  workflow.refreshBoundPapers(batchId)
}

watch(
  effectiveBatchId,
  (batchId) => {
    // 未显式传入 scanBatchId 时由 workflow.boundPaperScanBatchId 监听统一刷新，避免双请求
    if (!props.scanBatchId) return
    if (batchId) {
      void workflow.refreshBoundPapers(batchId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="bound-panel" :class="`bound-panel--${props.variant}`">
    <header class="bound-head">
      <div>
        <h4>本批次已绑定学生</h4>
        <small>{{ summaryText }}</small>
      </div>
      <button
        type="button"
        class="bound-refresh"
        :disabled="workflow.boundPapersLoading.value === true || !effectiveBatchId"
        @click="refresh"
      >
        <ReloadOutlined :spin="workflow.boundPapersLoading.value" />
        <span v-if="props.variant === 'panel'">刷新</span>
      </button>
    </header>

    <p v-if="!effectiveBatchId" class="bound-empty">
      当前无活跃扫描批次，绑定结果将在开始扫描后出现
    </p>

    <p
      v-else-if="workflow.boundPapersLoading.value === true && workflow.boundPapers.value.length === 0"
      class="bound-empty"
    >
      加载中…
    </p>
    <p v-else-if="workflow.boundPapers.value.length === 0" class="bound-empty">
      暂无已绑定学生，扫描识别后将自动出现
    </p>
    <div v-else class="bound-table-wrap">
      <table class="bound-table">
        <thead>
          <tr>
            <th>学号</th>
            <th>姓名</th>
            <th>班级</th>
            <th class="col-pages">页数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in workflow.boundPapers.value" :key="item.paperInstanceId">
            <td>{{ item.studentNo }}</td>
            <td>{{ item.studentName }}</td>
            <td>{{ item.className || '—' }}</td>
            <td class="col-pages">{{ item.registeredPageCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.bound-panel {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  min-height: 0;
}

.bound-panel--rail {
  gap: var(--kiosk-space-2);
}

.bound-panel--panel {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  padding: var(--kiosk-space-3);
}

.bound-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
}

.bound-head h4 {
  margin: 0 0 2px;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.bound-head small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.bound-refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-1);
  height: 32px;
  padding: 0 var(--kiosk-space-2);
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.bound-refresh:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}

.bound-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.bound-empty {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  text-align: center;
  padding: var(--kiosk-space-3) 0;
}

.bound-table-wrap {
  overflow: auto;
  min-height: 0;
}

.bound-panel--rail .bound-table-wrap {
  max-height: 240px;
}

.bound-panel--panel .bound-table-wrap {
  max-height: 280px;
}

.bound-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--kiosk-fz-caption);
}

.bound-table th,
.bound-table td {
  padding: var(--kiosk-space-2) var(--kiosk-space-2);
  text-align: left;
  border-bottom: 1px solid var(--kiosk-divider);
}

.bound-table th {
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-tertiary);
  position: sticky;
  top: 0;
  background: var(--kiosk-surface);
}

.bound-table td {
  color: var(--kiosk-ink-primary);
}

.col-pages {
  width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
