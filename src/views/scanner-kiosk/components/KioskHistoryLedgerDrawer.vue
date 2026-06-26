<script setup lang="ts">
import type { ExamScannerPageLedgerItemVO } from '@/apis/mark/scanner-kiosk'
/**
 * KioskHistoryLedgerDrawer - 历史批次页级账本抽屉
 *
 * 由 HistoryStage 行点击「查看 ledger」触发：
 *   1. workflow.viewBatchHistoryLedger(item) 拉取 page-ledger 快照
 *   2. 抽屉显示批次概要 + ledger items + attentionItems
 *   3. 关闭时调用 workflow.closeBatchHistoryLedger() 清理快照
 *
 * 与活跃 SSE 流账本（pageLedger）独立，互不污染。
 */
import {
  CheckCircleFilled,
  CloseCircleFilled,
  FileSearchOutlined,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

const open = computed({
  get: () => workflow.historyLedgerBatch.value !== null,
  set: (v: boolean) => {
    if (!v) ui.closeHistoryLedger()
  },
})

const batch = computed(() => workflow.historyLedgerBatch.value)
const snapshot = computed(() => workflow.historyLedgerSnapshot.value)
const loading = computed(() => workflow.historyLedgerLoading.value)
const errorText = computed(() => workflow.historyLedgerError.value)

const ledgerItems = computed(() => snapshot.value?.items ?? [])
const attentionItems = computed(() => snapshot.value?.attentionItems ?? [])

const headerBadgeTone = computed<'success' | 'warning' | 'danger' | 'muted'>(() => {
  const b = batch.value
  if (!b) return 'muted'
  if (b.discardedTime || b.status === 'DISCARDED') return 'danger'
  if (b.sealedTime) return 'success'
  if (b.status === 'BLOCKED') return 'warning'
  return 'muted'
})

const headerBadgeText = computed(() => {
  const b = batch.value
  if (!b) return ''
  if (b.discardedTime || b.status === 'DISCARDED') return '已废弃'
  if (b.sealedTime) return '已封存'
  return b.statusMessage
})

function modeText(): string {
  const b = batch.value
  if (!b) return '—'
  const mode = workflow.scanModeText(b.scanMode, '')
  if (b.scanMode !== 'SUPPLEMENT') return mode
  const replaceText = b.replaceTargetPage ? '替换目标页' : '追加补扫'
  const targetText = b.targetPageNo
    ? workflow.scanPageDisplayTitleByNoForDuplex(b.targetPageNo, b.scanConfig.duplexMode)
    : '未指定目标页'
  return `${mode} · ${replaceText} · ${targetText}`
}

function pageStatusLabel(item: ExamScannerPageLedgerItemVO): string {
  return workflow.registrationStatusText(item.registrationStatus)
}

function pageTitle(item: ExamScannerPageLedgerItemVO): string {
  const b = batch.value
  if (!b) return workflow.scanPageDisplayTitleByNo(item.pageNo)
  return workflow.scanPageDisplayTitleByNoForDuplex(item.pageNo, b.scanConfig.duplexMode)
}

function pageRowTone(
  item: ExamScannerPageLedgerItemVO,
): 'success' | 'warning' | 'danger' | 'muted' {
  if (item.attentionType) return 'warning'
  if (item.registrationStatus === 'DISCARDED') return 'danger'
  if (item.registrationStatus === 'REGISTERED') return 'success'
  return 'muted'
}
</script>

<template>
  <a-drawer
    v-model:open="open"
    placement="right"
    :width="600"
    :body-style="{ padding: 0, background: 'var(--kiosk-page-bg)' }"
    :header-style="{ display: 'none' }"
    :closable="false"
    :destroy-on-close="true"
  >
    <div v-if="batch" class="ledger-drawer">
      <header class="drawer-head">
        <div class="head-text">
          <strong>{{ batch.batchNo || batch.batchExternalNo }}</strong>
          <span class="head-meta">
            <span>{{ batch.batchExternalNo }}</span>
            <span class="dot" />
            <span>{{ modeText() }}</span>
          </span>
        </div>
        <span class="status-pill" :class="`tone-${headerBadgeTone}`">
          <CheckCircleFilled v-if="headerBadgeTone === 'success'" />
          <WarningFilled v-else-if="headerBadgeTone === 'warning'" />
          <CloseCircleFilled v-else-if="headerBadgeTone === 'danger'" />
          <span>{{ headerBadgeText }}</span>
        </span>
        <button type="button" class="drawer-close" title="关闭" @click="ui.closeHistoryLedger">
          ×
        </button>
      </header>

      <div class="drawer-body">
        <!-- 加载中 -->
        <div v-if="loading" class="ledger-empty">
          <FileSearchOutlined class="ledger-empty-icon spinning" />
          <p>正在拉取页级账本…</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="errorText" class="ledger-error">
          <WarningFilled />
          <span>{{ errorText }}</span>
        </div>

        <!-- 摘要 KV -->
        <section v-if="!loading && !errorText" class="section">
          <header class="section-head">
            <h3>批次摘要</h3>
          </header>
          <dl class="kv">
            <div>
              <dt>申报页数</dt>
              <dd>{{ batch.pageCount }}</dd>
            </div>
            <div>
              <dt>已落库页</dt>
              <dd>{{ snapshot?.registeredCount ?? '—' }}</dd>
            </div>
            <div>
              <dt>异常项</dt>
              <dd :class="{ warn: (snapshot?.attentionCount ?? 0) > 0 }">
                {{ snapshot?.attentionCount ?? '—' }}
              </dd>
            </div>
            <div>
              <dt>账本来源</dt>
              <dd>{{ snapshot ? workflow.ledgerSourceText(snapshot.dataSource) : '—' }}</dd>
            </div>
            <div>
              <dt>扫描开始</dt>
              <dd>{{ workflow.formatTime(batch.scanStartTime) }}</dd>
            </div>
            <div>
              <dt>扫描结束</dt>
              <dd>{{ workflow.formatTime(batch.scanEndTime) }}</dd>
            </div>
            <div v-if="batch.sealedTime">
              <dt>封存时间</dt>
              <dd>
                {{ workflow.formatTime(batch.sealedTime) }}
                <template v-if="batch.sealedUserId"> · 操作人 {{ batch.sealedUserId }}</template>
              </dd>
            </div>
            <div v-if="batch.discardedTime">
              <dt>废弃时间</dt>
              <dd class="danger">
                {{ workflow.formatTime(batch.discardedTime) }}
                <template v-if="batch.discardedUserId"> · 操作人 {{ batch.discardedUserId }}</template>
              </dd>
            </div>
            <div v-if="batch.discardReason">
              <dt>废弃原因</dt>
              <dd class="danger">{{ batch.discardReason }}</dd>
            </div>
          </dl>
        </section>

        <!-- ledger items -->
        <section v-if="!loading && !errorText" class="section">
          <header class="section-head">
            <h3>页面账本（{{ ledgerItems.length }}）</h3>
          </header>
          <p v-if="ledgerItems.length === 0" class="empty-inline">该批次尚无已入库或已上传页面</p>
          <ul v-else class="page-list">
            <li
              v-for="item in ledgerItems"
              :key="workflow.ledgerItemKey(item)"
              class="page-row"
              :class="`tone-${pageRowTone(item)}`"
            >
              <span class="page-no">{{ pageTitle(item) }}</span>
              <div class="page-text">
                <strong>{{ pageStatusLabel(item) }}</strong>
                <small v-if="item.attentionType">
                  {{ workflow.attentionTypeText(item.attentionType) }}
                  <template v-if="item.attentionMessage"> · {{ item.attentionMessage }}</template>
                </small>
                <small v-else-if="item.operatorName">
                  操作人 {{ item.operatorName }}
                  <template v-if="item.occurredAt">
                    · {{ workflow.formatTime(item.occurredAt) }}</template>
                </small>
              </div>
              <WarningFilled v-if="item.attentionType" class="page-warn" />
            </li>
          </ul>
        </section>

        <!-- attention items -->
        <section v-if="!loading && !errorText && attentionItems.length > 0" class="section">
          <header class="section-head">
            <h3>异常项（{{ attentionItems.length }}）</h3>
          </header>
          <ul class="page-list">
            <li v-for="att in attentionItems" :key="att.id" class="page-row tone-warning">
              <span class="page-no">{{ workflow.attentionTypeText(att.attentionType) }}</span>
              <div class="page-text">
                <strong>{{ workflow.attentionTypeText(att.attentionType) }}</strong>
                <small v-if="att.diagnostic">{{
                  workflow.scannerDiagnosticText(att.diagnostic)
                }}</small>
                <small v-if="att.updateTime">
                  最后更新 {{ workflow.formatTime(att.updateTime) }}
                </small>
              </div>
              <WarningFilled class="page-warn" />
            </li>
          </ul>
        </section>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.ledger-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--kiosk-page-bg);
  font-family: var(--kiosk-font-display);
  color: var(--kiosk-ink-primary);
}

.drawer-head {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  background: var(--kiosk-surface);
  border-bottom: 1px solid var(--kiosk-divider);
  box-shadow: var(--kiosk-shadow-1);
}
.head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.head-text strong {
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
  word-break: break-all;
}
.head-meta {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--kiosk-ink-tertiary);
  flex: 0 0 auto;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 28px;
  padding: 0 var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
  flex: 0 0 auto;
}
.status-pill.tone-success {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}
.status-pill.tone-warning {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}
.status-pill.tone-danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
}
.status-pill.tone-muted {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-tertiary);
}

.drawer-close {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-secondary);
  font-size: 22px;
  font-family: inherit;
  cursor: pointer;
  flex: 0 0 auto;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.drawer-close:hover {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
}

.section {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
}

.section-head {
  padding-bottom: var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
}
.section-head h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.kv {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kiosk-space-2);
}
.kv > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border-radius: var(--kiosk-radius-sm);
}
.kv dt {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.kv dd {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  word-break: break-all;
}
.kv dd {
  font-variant-numeric: tabular-nums;
}
.kv dd.danger {
  color: var(--kiosk-danger);
}
.kv dd.warn {
  color: var(--kiosk-warning);
}

.empty-inline {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  text-align: center;
  padding: var(--kiosk-space-4) 0;
}

.ledger-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-7);
  text-align: center;
  color: var(--kiosk-ink-tertiary);
}
.ledger-empty-icon {
  font-size: 36px;
  opacity: 0.6;
}
.ledger-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}
.spinning {
  animation: ledger-spin 1.5s linear infinite;
}
@keyframes ledger-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ledger-error {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-danger-soft);
  border: 1px solid rgba(197, 38, 62, 0.3);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-danger);
}

.page-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.page-row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
}
.page-row.tone-warning {
  border-color: rgba(217, 119, 6, 0.3);
  background: var(--kiosk-warning-soft);
}
.page-row.tone-danger {
  border-color: rgba(197, 38, 62, 0.3);
  background: var(--kiosk-danger-soft);
}
.page-row.tone-success {
  border-color: rgba(31, 157, 85, 0.25);
}

.page-no {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
  text-align: center;
}
.page-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.page-text strong {
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.page-text small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  word-break: break-all;
}
.page-warn {
  color: var(--kiosk-warning);
  font-size: 18px;
}
.page-row.tone-danger .page-warn {
  color: var(--kiosk-danger);
}
</style>
