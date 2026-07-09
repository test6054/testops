<script setup lang="ts">
import type { Component } from 'vue'
import type { ExamScannerBatchResponse } from '@/apis/mark/scanner-kiosk'
/**
 * 本机历史批次（只读）
 *
 * 展示本一体机 (examId, scannerDeviceId, scannerStationId) 名下的最近批次概览与历史列表。
 * 批次封存仅在教师 Web 端「扫描录入」页面执行。
 */
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  EyeOutlined,
  HistoryOutlined,
  LockFilled,
  PauseCircleOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  SafetyCertificateFilled,
} from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { ScannerKioskScanModeCode } from '@/apis/mark/scanner-kiosk'
import { ScanBatchStatusCode } from '@/types/enums/scan-batch-status-enum'
import KioskBoundStudentsPanel from '../components/KioskBoundStudentsPanel.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

const batch = computed(() => workflow.kioskContext.value?.latestBatch ?? null)

const isDiscarded = computed(
  () => batch.value?.discardedTime || batch.value?.status === ScanBatchStatusCode.DISCARDED,
)
const isSealed = computed(() => Boolean(batch.value?.sealedTime))
const awaitingWebSeal = computed(() =>
  Boolean(batch.value && !isSealed.value && !isDiscarded.value),
)

function handleIncludeDiscardedChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  workflow.changeBatchHistoryIncludeDiscarded(event.target.checked)
}

/** 时间线（综合 lifecycle、扫描起止与批次提交状态） */
interface TimelineEvent {
  key: string
  icon: Component
  tone: 'success' | 'running' | 'warning' | 'danger' | 'muted'
  label: string
  time?: string
  detail?: string
}

const timeline = computed<TimelineEvent[]>(() => {
  if (!batch.value) return []
  const b = batch.value
  const events: TimelineEvent[] = []
  if (b.scanStartTime) {
    events.push({
      key: 'scan-start',
      icon: PlayCircleFilled,
      tone: 'running',
      label: '扫描开始',
      time: workflow.formatTime(b.scanStartTime),
      detail: workflow.scanModeText(b.scanMode, ''),
    })
  }
  if (b.scanEndTime) {
    events.push({
      key: 'scan-end',
      icon: PauseCircleOutlined,
      tone: 'success',
      label: '扫描结束',
      time: workflow.formatTime(b.scanEndTime),
      detail: `共扫描 ${b.pageCount} 页`,
    })
  }
  events.push({
    key: 'commit',
    icon: CheckCircleFilled,
    tone: b.receivedPageCount === b.pageCount && b.pendingUploadCount === 0 ? 'success' : 'warning',
    label: '扫描页入库',
    detail: `${b.receivedPageCount} / ${b.pageCount} 页已落库${b.pendingUploadCount > 0 ? `, 待上传 ${b.pendingUploadCount}` : ''}`,
  })
  if (b.attentionItemCount > 0) {
    events.push({
      key: 'attention',
      icon: ExclamationCircleFilled,
      tone: 'warning',
      label: '存在异常待复核',
      detail: `${b.attentionItemCount} 项`,
    })
  }
  if (b.sealedTime) {
    events.push({
      key: 'sealed',
      icon: LockFilled,
      tone: 'success',
      label: '批次封存',
      time: workflow.formatTime(b.sealedTime),
      detail: b.sealedUserId ? `执行人 #${b.sealedUserId}` : undefined,
    })
  }
  if (b.discardedTime || b.status === ScanBatchStatusCode.DISCARDED) {
    events.push({
      key: 'discarded',
      icon: CloseCircleFilled,
      tone: 'danger',
      label: '批次废弃',
      time: workflow.formatTime(b.discardedTime),
      detail: b.discardReason || (b.discardedUserId ? `执行人 #${b.discardedUserId}` : undefined),
    })
  }
  return events
})

// ============ 历史批次列表 ============

const expandedHistoryId = ref<string | null>(null)

function toggleHistoryDetail(id: string) {
  expandedHistoryId.value = expandedHistoryId.value === id ? null : id
}

function reloadHistory() {
  workflow.batchHistoryFilter.pageNum = 1
  workflow.loadBatchHistory()
}

function historyBadgeTone(
  item: ExamScannerBatchResponse,
): 'success' | 'warning' | 'danger' | 'muted' {
  if (item.discardedTime || item.status === ScanBatchStatusCode.DISCARDED) return 'danger'
  if (item.sealedTime) return 'success'
  if (item.status === ScanBatchStatusCode.BLOCKED) return 'warning'
  return 'muted'
}

function historyBadgeText(item: ExamScannerBatchResponse): string {
  if (item.discardedTime || item.status === ScanBatchStatusCode.DISCARDED) return '已废弃'
  if (item.sealedTime) return '已封存'
  return item.statusMessage
}

function historyModeText(item: ExamScannerBatchResponse): string {
  const mode = workflow.scanModeText(item.scanMode, '')
  if (item.scanMode !== ScannerKioskScanModeCode.SUPPLEMENT) return mode
  const replaceText = item.replaceTargetPage ? '替换目标页' : '追加补扫'
  const targetText = item.targetPageNo
    ? workflow.scanPageDisplayTitleByNoForDuplex(item.targetPageNo, item.scanConfig.duplexMode)
    : '未指定目标页'
  return `${mode} · ${replaceText} · ${targetText}`
}

const historyTotalPages = computed(() =>
  Math.max(1, Math.ceil(workflow.batchHistoryTotal.value / workflow.batchHistoryFilter.pageSize)),
)

watch(
  () => [
    workflow.examId.value,
    workflow.kioskContext.value?.device?.scannerDeviceId,
    workflow.kioskContext.value?.device?.scannerStationId,
  ],
  () => {
    workflow.batchHistoryFilter.pageNum = 1
    workflow.loadBatchHistory()
  },
  { immediate: true },
)
</script>

<template>
  <section class="history-stage">
    <!-- 顶部摘要 banner -->
    <header v-if="batch" class="batch-banner">
      <div class="banner-main">
        <SafetyCertificateFilled class="banner-icon" />
        <div class="banner-text">
          <strong>{{ batch.batchNo || batch.batchExternalNo }}</strong>
          <span class="banner-meta">
            <span>{{ workflow.latestBatchModeText.value }}</span>
            <span class="dot" />
            <span>{{ batch.statusMessage }}</span>
          </span>
        </div>
      </div>
      <div class="banner-badges">
        <span v-if="isSealed" class="badge badge-success"> <LockFilled />已封存 </span>
        <span v-else-if="isDiscarded" class="badge badge-danger">
          <CloseCircleFilled />已废弃
        </span>
        <span v-else-if="awaitingWebSeal" class="badge badge-warning"> 待 Web 封存 </span>
      </div>
    </header>
    <div v-if="!batch" class="batch-empty">
      <SafetyCertificateFilled class="batch-empty-icon" />
      <p>当前考试暂无已落库扫描批次</p>
      <small>请先返回「准备扫描」完成一次扫描并等待扫描页入库</small>
    </div>
    <div v-else-if="awaitingWebSeal" class="web-seal-hint">
      <ExclamationCircleFilled />
      <span>本批次已提交，请在教师 Web 端「扫描录入」页面核对后封存。</span>
    </div>

    <div v-if="batch" class="history-body">
      <main class="history-main">
        <article class="card">
          <header><h3>批次时间线</h3></header>
          <ul class="timeline">
            <li v-for="event in timeline" :key="event.key" :class="`event tone-${event.tone}`">
              <span class="event-icon"><component :is="event.icon" /></span>
              <div class="event-text">
                <strong>{{ event.label }}</strong>
                <span v-if="event.time" class="event-time">{{ event.time }}</span>
                <small v-if="event.detail">{{ event.detail }}</small>
              </div>
            </li>
          </ul>
        </article>

        <KioskBoundStudentsPanel variant="panel" :scan-batch-id="batch?.scanBatchId" />

        <article class="card">
          <header><h3>批次明细</h3></header>
          <dl class="detail-kv">
            <div>
              <dt>扫描模式</dt>
              <dd>{{ workflow.latestBatchModeText.value }}</dd>
            </div>
            <div>
              <dt>申报页数</dt>
              <dd>{{ batch.pageCount }}</dd>
            </div>
            <div>
              <dt>已落库页数</dt>
              <dd>{{ batch.receivedPageCount }}</dd>
            </div>
            <div :class="{ warn: batch.pendingUploadCount > 0 }">
              <dt>待上传页数</dt>
              <dd>{{ batch.pendingUploadCount }}</dd>
            </div>
            <div :class="{ warn: batch.attentionItemCount > 0 }">
              <dt>异常项</dt>
              <dd>{{ batch.attentionItemCount }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ batch.statusMessage }}</dd>
            </div>
            <div>
              <dt>批次外部号</dt>
              <dd>{{ batch.batchExternalNo }}</dd>
            </div>
            <div v-if="batch.diagnostic">
              <dt>处理说明</dt>
              <dd class="danger">{{ workflow.scannerDiagnosticText(batch.diagnostic) }}</dd>
            </div>
          </dl>
        </article>
      </main>
    </div>

    <!-- 历史批次列表 Section（独立行，宽度全宽） -->
    <article class="history-card">
      <header class="history-head">
        <div class="history-title">
          <HistoryOutlined class="history-icon" />
          <h3>历史批次</h3>
          <span class="history-total">
            共 <strong>{{ workflow.batchHistoryTotal.value }}</strong> 条
          </span>
        </div>
        <div class="history-tools">
          <label class="history-toggle">
            <input
              type="checkbox"
              :checked="workflow.batchHistoryFilter.includeDiscarded"
              @change="handleIncludeDiscardedChange"
            />
            <span>包含已废弃</span>
          </label>
          <button
            type="button"
            class="history-refresh"
            :disabled="workflow.batchHistoryLoading.value"
            title="刷新历史批次"
            @click="reloadHistory"
          >
            <ReloadOutlined :spin="workflow.batchHistoryLoading.value" />
            <span>刷新</span>
          </button>
        </div>
      </header>

      <!-- 时间范围过滤 -->
      <div class="history-time-range">
        <label class="time-input">
          <span class="time-label">起始扫描时间</span>
          <input
            v-model="workflow.batchHistoryFilter.scanStartTimeFrom"
            type="datetime-local"
            :disabled="workflow.batchHistoryLoading.value"
          />
        </label>
        <span class="time-tilde">至</span>
        <label class="time-input">
          <span class="time-label">结束扫描时间</span>
          <input
            v-model="workflow.batchHistoryFilter.scanStartTimeTo"
            type="datetime-local"
            :disabled="workflow.batchHistoryLoading.value"
          />
        </label>
        <button
          type="button"
          class="time-apply"
          :disabled="workflow.batchHistoryLoading.value"
          @click="workflow.applyBatchHistoryTimeRange"
        >
          应用
        </button>
        <button
          type="button"
          class="time-clear"
          :disabled="
            workflow.batchHistoryLoading.value
              || (!workflow.batchHistoryFilter.scanStartTimeFrom
                && !workflow.batchHistoryFilter.scanStartTimeTo)
          "
          @click="workflow.clearBatchHistoryTimeRange"
        >
          清空
        </button>
      </div>

      <div
        v-if="workflow.batchHistoryLoading.value && workflow.batchHistoryList.value.length === 0"
        class="history-empty"
      >
        加载历史批次中…
      </div>
      <div v-else-if="workflow.batchHistoryList.value.length === 0" class="history-empty">
        <p>本一体机暂无历史批次</p>
        <small>选择考试并完成首次扫描后，批次将出现在此处</small>
      </div>

      <ul v-else class="history-list">
        <li
          v-for="item in workflow.batchHistoryList.value"
          :key="item.scanBatchId"
          class="history-item"
          :class="{ active: expandedHistoryId === item.scanBatchId }"
        >
          <button type="button" class="history-row" @click="toggleHistoryDetail(item.scanBatchId)">
            <div class="history-cell history-cell--main">
              <strong>{{ item.batchNo || item.batchExternalNo }}</strong>
              <span>{{ item.batchExternalNo }}</span>
            </div>
            <div class="history-cell">
              <small>模式</small>
              <span>{{ historyModeText(item) }}</span>
            </div>
            <div class="history-cell">
              <small>页数</small>
              <span>{{ item.pageCount }}</span>
            </div>
            <div class="history-cell">
              <small>扫描时间</small>
              <span>{{ workflow.formatTime(item.scanStartTime) }}</span>
            </div>
            <div class="history-cell history-cell--badge">
              <span class="history-badge" :class="`tone-${historyBadgeTone(item)}`">
                {{ historyBadgeText(item) }}
              </span>
            </div>
          </button>

          <div v-if="expandedHistoryId === item.scanBatchId" class="history-detail">
            <dl class="detail-kv detail-kv--inline">
              <div>
                <dt>状态</dt>
                <dd>{{ historyBadgeText(item) }}</dd>
              </div>
              <div>
                <dt>扫描结束</dt>
                <dd>{{ workflow.formatTime(item.scanEndTime) }}</dd>
              </div>
              <div v-if="item.receivedPageCount !== undefined">
                <dt>已落库页</dt>
                <dd>{{ item.receivedPageCount }} / {{ item.pageCount }}</dd>
              </div>
              <div
                v-if="item.pendingUploadCount !== undefined && item.pendingUploadCount > 0"
                class="warn"
              >
                <dt>待上传</dt>
                <dd>{{ item.pendingUploadCount }}</dd>
              </div>
              <div
                v-if="item.attentionItemCount !== undefined && item.attentionItemCount > 0"
                class="warn"
              >
                <dt>异常项</dt>
                <dd>{{ item.attentionItemCount }}</dd>
              </div>
              <div v-if="item.eventCount !== undefined">
                <dt>事件数</dt>
                <dd>{{ item.eventCount }}</dd>
              </div>
              <div v-if="item.sealedTime">
                <dt>封存时间</dt>
                <dd>
                  {{ workflow.formatTime(item.sealedTime) }}
                  <template v-if="item.sealedUserId"> · 操作人 {{ item.sealedUserId }}</template>
                </dd>
              </div>
              <div v-if="item.discardedTime">
                <dt>废弃时间</dt>
                <dd class="danger">
                  {{ workflow.formatTime(item.discardedTime) }}
                  <template v-if="item.discardedUserId">
                    · 操作人 {{ item.discardedUserId }}
                  </template>
                </dd>
              </div>
              <div v-if="item.discardReason" class="detail-kv-full">
                <dt>废弃原因</dt>
                <dd class="danger">{{ item.discardReason }}</dd>
              </div>
              <div v-if="item.diagnostic" class="detail-kv-full">
                <dt>处理说明</dt>
                <dd class="danger">{{ workflow.scannerDiagnosticText(item.diagnostic) }}</dd>
              </div>
              <div v-if="item.supplementReason" class="detail-kv-full">
                <dt>补扫原因</dt>
                <dd>{{ item.supplementReason }}</dd>
              </div>
            </dl>
            <div class="detail-actions">
              <button type="button" class="detail-cta" @click="ui.viewHistoryLedger(item)">
                <EyeOutlined />
                <span>查看页级账本</span>
              </button>
            </div>
          </div>
        </li>
      </ul>

      <!-- 分页 -->
      <footer
        v-if="workflow.batchHistoryTotal.value > workflow.batchHistoryFilter.pageSize"
        class="history-pager"
      >
        <button
          type="button"
          class="pager-btn"
          :disabled="workflow.batchHistoryFilter.pageNum <= 1 || workflow.batchHistoryLoading.value"
          @click="workflow.changeBatchHistoryPage(workflow.batchHistoryFilter.pageNum - 1)"
        >
          上一页
        </button>
        <span class="pager-info">
          第 <strong>{{ workflow.batchHistoryFilter.pageNum }}</strong> / {{ historyTotalPages }} 页
        </span>
        <button
          type="button"
          class="pager-btn"
          :disabled="
            workflow.batchHistoryFilter.pageNum >= historyTotalPages
              || workflow.batchHistoryLoading.value
          "
          @click="workflow.changeBatchHistoryPage(workflow.batchHistoryFilter.pageNum + 1)"
        >
          下一页
        </button>
      </footer>
    </article>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.history-stage {
  max-width: bp.$shell-laptop-max;
  margin: 0 auto;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  height: 100%;
  min-height: 0;
}

/* ============ 顶部 banner ============ */

.batch-banner {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  box-shadow: var(--kiosk-shadow-1);
}
.banner-main {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  flex: 1;
  min-width: 0;
}
.banner-icon {
  font-size: 36px;
  color: var(--kiosk-primary);
  flex: 0 0 auto;
}
.banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.banner-text strong {
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
  word-break: break-all;
}
.banner-meta {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--kiosk-ink-tertiary);
  flex: 0 0 auto;
}

.banner-badges {
  display: flex;
  gap: var(--kiosk-space-2);
  flex: 0 0 auto;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 32px;
  padding: 0 var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
}
.badge-success {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}
.badge-warning {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}
.badge-danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
}

/* ============ 空状态 ============ */

.batch-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-7);
  background: var(--kiosk-surface);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-lg);
  color: var(--kiosk-ink-tertiary);
  text-align: center;
}
.batch-empty-icon {
  font-size: 56px;
  color: var(--kiosk-divider-strong);
  margin-bottom: var(--kiosk-space-2);
}
.batch-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  color: var(--kiosk-ink-secondary);
}
.batch-empty small {
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-tertiary);
}

/* ============ Body grid ============ */

.history-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  min-height: 0;
}

.history-main {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  min-height: 0;
  overflow-y: auto;
}

.web-seal-hint {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  background: var(--kiosk-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.25);
  border-radius: var(--kiosk-radius-md);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
}

/* ============ 卡片 ============ */

.card {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  box-shadow: var(--kiosk-shadow-1);
}

.card header h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

/* ============ Timeline ============ */

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--kiosk-divider);
}

.event {
  display: flex;
  align-items: flex-start;
  gap: var(--kiosk-space-3);
  position: relative;
  z-index: 1;
}
.event-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-tertiary);
  font-size: 18px;
  flex: 0 0 auto;
}
.event.tone-success .event-icon {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}
.event.tone-running .event-icon {
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
}
.event.tone-warning .event-icon {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}
.event.tone-danger .event-icon {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
}

.event-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 6px;
  flex: 1;
}
.event-text strong {
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.event-time {
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}
.event-text small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

/* ============ 批次明细 KV ============ */

.detail-kv {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kiosk-space-3);
  margin: 0;
}
.detail-kv > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border-radius: var(--kiosk-radius-sm);
}
.detail-kv > div.warn {
  background: var(--kiosk-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.2);
}
.detail-kv dt {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.detail-kv dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  word-break: break-all;
}
.detail-kv dd.danger {
  color: var(--kiosk-danger);
  font-size: var(--kiosk-fz-label);
}
.detail-kv .warn dd {
  color: var(--kiosk-warning);
}

/* ============ 历史批次 Section ============ */

.history-card {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  box-shadow: var(--kiosk-shadow-1);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
  padding-bottom: var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
  flex-wrap: wrap;
}
.history-title {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
}
.history-icon {
  font-size: 22px;
  color: var(--kiosk-primary);
}
.history-title h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.history-total {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.history-total strong {
  font-variant-numeric: tabular-nums;
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
  margin: 0 2px;
}

.history-tools {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
}
.history-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  user-select: none;
}
.history-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--kiosk-primary);
}
.history-refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.history-refresh:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.history-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.history-time-range {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  flex-wrap: wrap;
}
.time-input {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 200px;
}
.time-label {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.time-input input {
  height: 36px;
  padding: 0 var(--kiosk-space-2);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  outline: none;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.time-input input:focus {
  border-color: var(--kiosk-primary);
}
.time-input input:disabled {
  background: var(--kiosk-neutral-soft);
  cursor: not-allowed;
}
.time-tilde {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  align-self: flex-end;
  padding-bottom: 8px;
}
.time-apply,
.time-clear {
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
  align-self: flex-end;
  margin-bottom: 0;
}
.time-apply {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border: 1px solid var(--kiosk-primary);
}
.time-apply:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}
.time-apply:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  border-color: var(--kiosk-neutral);
  cursor: not-allowed;
}
.time-clear {
  background: transparent;
  color: var(--kiosk-ink-secondary);
  border: 1px solid var(--kiosk-divider);
}
.time-clear:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.time-clear:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.detail-actions {
  margin-top: var(--kiosk-space-3);
  display: flex;
  justify-content: flex-end;
}
.detail-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 40px;
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
  border: 1px solid var(--kiosk-primary);
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.detail-cta:hover {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-7) var(--kiosk-space-4);
  text-align: center;
  color: var(--kiosk-ink-tertiary);
  background: var(--kiosk-surface-alt);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
}
.history-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}
.history-empty small {
  font-size: var(--kiosk-fz-caption);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.history-item {
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  overflow: hidden;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.history-item:hover {
  border-color: var(--kiosk-primary);
}
.history-item.active {
  border-color: var(--kiosk-primary);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.12);
}

.history-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(140px, 1.5fr) 80px minmax(160px, 1.5fr) 110px;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.history-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.history-cell small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.history-cell span,
.history-cell strong {
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-cell strong {
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
}

.history-cell--main {
  gap: 4px;
}
.history-cell--main span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.history-cell--badge {
  align-items: flex-end;
}
.history-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
}
.history-badge.tone-success {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}
.history-badge.tone-warning {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}
.history-badge.tone-danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
}
.history-badge.tone-muted {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-tertiary);
}

.history-detail {
  background: var(--kiosk-surface);
  border-top: 1px solid var(--kiosk-divider);
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
}

.detail-kv--inline {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.detail-kv-full {
  grid-column: 1 / -1;
}

.history-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-3);
  padding-top: var(--kiosk-space-3);
  border-top: 1px solid var(--kiosk-divider);
}
.pager-btn {
  height: 36px;
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.pager-btn:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.pager-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.pager-info {
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-tertiary);
}
.pager-info strong {
  color: var(--kiosk-ink-primary);
  font-weight: var(--kiosk-fw-bold);
}

@media (max-width: bp.$shell-laptop-max) {
  .history-body {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
  .detail-kv {
    grid-template-columns: 1fr;
  }
  .history-row {
    grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr) 60px minmax(140px, 1fr) 90px;
  }
}
@media (max-width: bp.$shell-tablet-max) {
  .history-body {
    grid-template-columns: 1fr;
  }
  .history-row {
    grid-template-columns: 1fr 1fr;
    gap: var(--kiosk-space-2);
  }
  .history-cell--badge {
    grid-column: 2;
    align-items: flex-start;
  }
}
</style>
