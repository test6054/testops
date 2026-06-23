<script setup lang="ts">
/**
 * 讯飞式扫描工作台：左任务合同 + 中设备就绪大卡 + 下会话批次表。
 */
import {
  PlayCircleFilled,
  PrinterOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, mutex, ui } = useKioskCtx()

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const exam = computed(() => workflow.kioskContext.value?.exam)
const batches = computed(() => workflow.kioskContext.value?.sessionBatches ?? [])
const readiness = computed(() => workflow.deviceReadiness.value)
const startReason = computed(() => mutex.reasonOf('startScan'))

const breadcrumb = computed(() => {
  const name = exam.value?.examName || '未绑定考试'
  const course = exam.value?.courseName
  return course ? `${name}（${course}）` : name
})

function refreshDevice() {
  void workflow.refreshAll()
}

function openParams() {
  ui.openScanParams()
}

function startScan() {
  if (workflow.canStartScan.value) workflow.submitScanJob()
}
</script>

<template>
  <section class="workbench">
    <header class="workbench__crumb">
      <span>当前位置：{{ breadcrumb }} &gt; 扫描答卷</span>
    </header>

    <div class="workbench__grid">
      <aside class="contract">
        <h2 class="contract__title">{{ exam?.examName || '—' }}</h2>
        <p v-if="contract?.gradeSubjectText" class="contract__sub">{{ contract.gradeSubjectText }}</p>

        <dl class="contract__kv">
          <div>
            <dt>应扫张数</dt>
            <dd>{{ contract?.expectedSheetCount ?? '—' }}</dd>
          </div>
          <div>
            <dt>计划人数</dt>
            <dd>{{ contract?.plannedStudentCount ?? '—' }}</dd>
          </div>
          <div>
            <dt>已扫张数</dt>
            <dd>{{ contract?.scannedSheetCount ?? '—' }}</dd>
          </div>
          <div v-if="contract?.schoolName">
            <dt>学校</dt>
            <dd>{{ contract.schoolName }}</dd>
          </div>
          <div v-if="contract?.templateDisplayName">
            <dt>模板</dt>
            <dd>{{ contract.templateDisplayName }}</dd>
          </div>
        </dl>

        <div v-if="contract" class="contract__meta">
          <p>纸型 {{ contract.paperStyleText }}</p>
          <p>考号 {{ contract.candidateIdFormatText }}</p>
          <p>客观题 {{ contract.objectiveQuestionCount }} · 主观题 {{ contract.subjectiveQuestionCount }}</p>
        </div>
      </aside>

      <div class="main">
        <div class="main__status-row">
          <span class="status-text" :class="`status-text--${readiness.tone}`">
            状态：{{ readiness.statusText }}
          </span>
          <button type="button" class="icon-btn" title="刷新设备状态" @click="refreshDevice">
            <ReloadOutlined :spin="workflow.loading.value" />
          </button>
        </div>

        <div class="hero" :class="`hero--${readiness.tone}`">
          <PrinterOutlined class="hero__icon" />
          <strong>{{ readiness.headline }}</strong>
          <p v-if="readiness.troubleshooting">{{ readiness.troubleshooting }}</p>
          <p v-else-if="readiness.tone !== 'success'">{{ readiness.detail }}</p>
        </div>

        <div class="actions">
          <button type="button" class="ghost-btn" @click="openParams">
            <SettingOutlined />
            <span>扫描参数</span>
          </button>
          <button
            type="button"
            class="start-btn"
            :disabled="!workflow.canStartScan.value"
            :title="startReason || workflow.scanBlockedReason.value || '开始扫描'"
            @click="startScan"
          >
            <PlayCircleFilled />
            <span>开始扫描</span>
          </button>
        </div>

        <div class="batches">
          <h3>扫描批次</h3>
          <table v-if="batches.length" class="batch-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>扫描</th>
                <th>异常</th>
                <th>上传</th>
                <th>开始时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in batches" :key="row.scanBatchId">
                <td>{{ row.batchNo || row.batchExternalNo }}</td>
                <td>{{ row.scannedCount }}</td>
                <td>{{ row.exceptionCount }}</td>
                <td>{{ row.uploadedCount }}</td>
                <td>{{ workflow.formatTime(row.scanStartTime) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="batches__empty">暂无数据</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
}

.workbench__crumb {
  margin-bottom: var(--kiosk-space-4);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.workbench__grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: var(--kiosk-space-5);
  flex: 1;
  min-height: 0;
}

.contract {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
}

.contract__title {
  margin: 0 0 var(--kiosk-space-1);
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
}

.contract__sub {
  margin: 0 0 var(--kiosk-space-4);
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-label);
}

.contract__kv {
  margin: 0 0 var(--kiosk-space-4);
  display: grid;
  gap: var(--kiosk-space-3);
}

.contract__kv div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: var(--kiosk-space-2);
}

.contract__kv dt {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.contract__kv dd {
  margin: 0;
  font-weight: var(--kiosk-fw-medium);
}

.contract__meta {
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border-radius: var(--kiosk-radius-md);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.contract__meta p {
  margin: 0 0 var(--kiosk-space-1);
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-5);
}

.main__status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-text--success {
  color: var(--kiosk-success);
}

.status-text--danger {
  color: var(--kiosk-danger);
}

.status-text--warning {
  color: var(--kiosk-warning);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  cursor: pointer;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-3);
  min-height: 180px;
  border-radius: var(--kiosk-radius-md);
  text-align: center;
  padding: var(--kiosk-space-5);
}

.hero--success {
  background: var(--kiosk-success);
  color: #fff;
}

.hero--danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
  border: 1px solid var(--kiosk-danger);
}

.hero--warning {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-ink-primary);
  border: 1px solid var(--kiosk-warning);
}

.hero__icon {
  font-size: 40px;
}

.hero strong {
  font-size: var(--kiosk-fz-h2);
}

.hero p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: var(--kiosk-space-3);
  justify-content: center;
}

.ghost-btn,
.start-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 48px;
  padding: 0 var(--kiosk-space-5);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.ghost-btn {
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.start-btn {
  background: var(--kiosk-primary);
  border: none;
  color: #fff;
  min-width: 200px;
  justify-content: center;
}

.start-btn:disabled {
  background: var(--kiosk-neutral);
  cursor: not-allowed;
}

.batches h3 {
  margin: 0 0 var(--kiosk-space-3);
  font-size: var(--kiosk-fz-h3);
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--kiosk-fz-label);
}

.batch-table th,
.batch-table td {
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  border-bottom: 1px solid var(--kiosk-divider);
  text-align: left;
}

.batches__empty {
  margin: 0;
  padding: var(--kiosk-space-6);
  text-align: center;
  color: var(--kiosk-ink-tertiary);
}

@media (max-width: 1024px) {
  .workbench__grid {
    grid-template-columns: 1fr;
  }
}
</style>
