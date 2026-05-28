<script setup lang="ts">
/**
 * Stage 3 - 复核与异常处置
 *
 * 业务定位：currentJob 存在且包含异常 / 失败页，或者上传/commit 卡住。
 * 三栏布局：
 *   左 320px  · 异常列表（FAILED 页 + attentionItems）
 *   中 flex   · 选中项大画布预览
 *   右 280px  · 操作面板（重试 / 删除 / 移除 / 刷新）+ 批次摘要
 */
import {
  CloseCircleFilled,
  DeleteOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

interface ReviewItem {
  key: string
  pageNo: number
  type: 'page-failed' | 'attention'
  title: string
  description: string
  detail?: string
  status?: string
  source: 'job' | 'ledger'
  localPageId?: string
}

/** 失败页（直接从 currentJob.pages 中筛选） */
const failedPages = computed<ReviewItem[]>(() =>
  workflow.exceptionPages.value.map(
    (page): ReviewItem => ({
      key: `page-${page.pageNo}`,
      pageNo: page.pageNo,
      type: 'page-failed',
      title: `第 ${page.pageNo} 页`,
      description: page.status === 'FAILED' ? '上传失败' : '页诊断异常',
      detail: typeof page.diagnostic === 'string' ? page.diagnostic : undefined,
      status: page.status,
      source: 'job',
    }),
  ),
)

/** 账本异常待办（attentionItems + ledger 异常页） */
const ledgerAttentions = computed<ReviewItem[]>(() => {
  const ledger = workflow.pageLedger.value
  if (!ledger) return []
  const ledgerItems = ledger.items.filter((item) => Boolean(item.attentionType))
  return ledgerItems.map(
    (item): ReviewItem => ({
      key: `ledger-${workflow.ledgerItemKey(item)}`,
      pageNo: item.pageNo,
      type: 'attention',
      title: `第 ${item.pageNo} 页 · ${workflow.attentionTypeText(item.attentionType!)}`,
      description:
        item.attentionMessage || workflow.registrationStatusText(item.registrationStatus),
      detail: item.operatorName
        ? `操作人 ${item.operatorName} · ${workflow.formatTime(item.occurredAt)}`
        : workflow.formatTime(item.occurredAt),
      source: 'ledger',
      localPageId: item.localPageId,
    }),
  )
})

const reviewItems = computed(() => [...failedPages.value, ...ledgerAttentions.value])

const selectedItem = computed<ReviewItem | null>(() => {
  if (!workflow.previewPageNo.value) return null
  return reviewItems.value.find((item) => item.pageNo === workflow.previewPageNo.value) ?? null
})

function selectItem(item: ReviewItem) {
  workflow.previewPageNo.value = item.pageNo
}

function discardSelected() {
  if (!selectedItem.value || selectedItem.value.source !== 'ledger') return
  if (!workflow.canDiscardLedgerPage.value) return
  workflow.discardLedgerPage({
    pageNo: selectedItem.value.pageNo,
    localPageId: selectedItem.value.localPageId,
  })
}

const job = computed(() => workflow.currentJob.value)
const batch = computed(() => workflow.kioskContext.value?.latestBatch ?? null)

const totalIssues = computed(() => reviewItems.value.length)
const failedCount = computed(() => failedPages.value.length)
const attentionCount = computed(() => ledgerAttentions.value.length)
</script>

<template>
  <section class="review-stage">
    <!-- 左：异常列表 -->
    <aside class="issue-list">
      <header class="issue-head">
        <div>
          <h3>待复核 ({{ totalIssues }})</h3>
          <small>
            <template v-if="failedCount > 0">失败 {{ failedCount }} · </template>
            <template v-if="attentionCount > 0">异常 {{ attentionCount }} · </template>
            <template v-if="totalIssues === 0">无待处理</template>
          </small>
        </div>
        <button
          type="button"
          class="issue-refresh"
          :disabled="workflow.pageLedgerLoading.value"
          title="刷新账本"
          @click="workflow.onManualRefreshLedger"
        >
          <ReloadOutlined :spin="workflow.pageLedgerLoading.value" />
        </button>
      </header>

      <div v-if="totalIssues === 0" class="issue-empty">
        <ExclamationCircleFilled class="issue-empty-icon" />
        <p>暂无需要复核的项</p>
        <small>所有页面上传成功且无异常待办</small>
      </div>

      <ul v-else class="issue-items">
        <li
          v-for="item in reviewItems"
          :key="item.key"
          class="issue-item"
          :class="{
            'active': selectedItem?.key === item.key,
            'item-failed': item.type === 'page-failed',
            'item-attention': item.type === 'attention',
          }"
        >
          <button type="button" @click="selectItem(item)">
            <div class="issue-item-icon">
              <CloseCircleFilled v-if="item.type === 'page-failed'" />
              <WarningFilled v-else />
            </div>
            <div class="issue-item-text">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
              <small v-if="item.detail">{{ item.detail }}</small>
            </div>
          </button>
        </li>
      </ul>
    </aside>

    <!-- 中：大画布预览 -->
    <main class="preview-wrap">
      <div class="preview-canvas">
        <div v-if="!job" class="preview-empty">
          <FileTextOutlined class="preview-empty-icon" />
          <p>暂无扫描批次</p>
          <small>请返回「准备扫描」开始一次扫描后再进行复核</small>
        </div>
        <div v-else-if="!selectedItem" class="preview-empty">
          <FileTextOutlined class="preview-empty-icon" />
          <p v-if="totalIssues > 0">请在左侧选择待复核项查看影像</p>
          <p v-else>无可预览影像</p>
          <small v-if="totalIssues > 0">点击列表条目展示对应页面</small>
        </div>
        <div v-else-if="!workflow.previewImageUrl.value" class="preview-empty">
          <FileTextOutlined class="preview-empty-icon" />
          <p>影像未就绪</p>
          <small>第 {{ selectedItem.pageNo }} 页尚未生成或已删除</small>
        </div>
        <img
          v-else
          class="preview-image"
          :src="workflow.previewImageUrl.value"
          :alt="`第 ${selectedItem.pageNo} 页`"
          draggable="false"
        />

        <!-- 选中项浮动信息条 -->
        <div v-if="selectedItem" class="preview-banner">
          <span class="banner-no">#{{ selectedItem.pageNo }}</span>
          <span class="banner-title">{{ selectedItem.title }}</span>
          <span class="banner-desc">{{ selectedItem.description }}</span>
        </div>
      </div>
    </main>

    <!-- 右：操作面板 + 批次摘要 -->
    <aside class="actions-panel">
      <section class="panel-section">
        <header><h4>处置操作</h4></header>
        <button
          type="button"
          class="op-btn"
          :disabled="!workflow.canRetryUpload.value"
          :title="workflow.canRetryUpload.value ? '重新上传失败的页' : '当前无可重试的失败页'"
          @click="workflow.retryCurrentUpload"
        >
          <SyncOutlined />
          <span>重试上传失败页</span>
        </button>
        <button
          type="button"
          class="op-btn"
          :disabled="!workflow.canRetryCommit.value"
          :title="
            workflow.canRetryCommit.value
              ? '所有页已上传，重新触发批次提交'
              : '不满足重试 commit 条件'
          "
          @click="workflow.retryCurrentCommit"
        >
          <ReloadOutlined />
          <span>重试批次提交</span>
        </button>
        <button
          type="button"
          class="op-btn op-btn--danger"
          :disabled="
            !selectedItem
              || selectedItem.source !== 'ledger'
              || !workflow.canDiscardLedgerPage.value
          "
          :title="
            selectedItem
              ? selectedItem.source === 'ledger'
                ? '将选中页标记为废弃，需要补扫'
                : '失败页可走重试上传，不需要废弃'
              : '请先在左侧选择待复核项'
          "
          @click="discardSelected"
        >
          <DeleteOutlined />
          <span>废弃选中页</span>
        </button>
        <button
          type="button"
          class="op-btn op-btn--danger-ghost"
          :disabled="!workflow.canRemoveCurrentJob.value"
          :title="workflow.removeCurrentJobTitle.value"
          @click="workflow.removeCurrentScanJob"
        >
          <CloseCircleFilled />
          <span>强制移除批次</span>
        </button>
      </section>

      <section v-if="job" class="panel-section panel-summary">
        <header><h4>批次摘要</h4></header>
        <dl class="summary-kv">
          <div>
            <dt>状态</dt>
            <dd>{{ job.status }}</dd>
          </div>
          <div>
            <dt>扫描模式</dt>
            <dd>{{ workflow.scanModeText(job.scanMode, '') }}</dd>
          </div>
          <div>
            <dt>已扫描</dt>
            <dd>{{ job.scannedPages }}</dd>
          </div>
          <div>
            <dt>已上传</dt>
            <dd>{{ job.uploadedPages }}</dd>
          </div>
          <div v-if="batch?.batchExternalNo">
            <dt>批次外部号</dt>
            <dd class="mono">{{ batch.batchExternalNo }}</dd>
          </div>
        </dl>
        <div v-if="workflow.pageLedgerError.value" class="ledger-error">
          {{ workflow.ledgerErrorText(workflow.pageLedgerError.value) }}
        </div>
      </section>
    </aside>
  </section>
</template>

<style scoped>
.review-stage {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  gap: var(--kiosk-space-3);
  height: 100%;
  min-height: 0;
}

/* ============ 左：异常列表 ============ */

.issue-list {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  min-height: 0;
  overflow: hidden;
}

.issue-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-1) var(--kiosk-space-2) var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
}
.issue-head h3 {
  margin: 0 0 2px;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.issue-head small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.issue-refresh {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.issue-refresh:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.issue-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.issue-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-5) var(--kiosk-space-3);
  color: var(--kiosk-ink-tertiary);
}
.issue-empty-icon {
  font-size: 36px;
  color: var(--kiosk-success);
  margin-bottom: var(--kiosk-space-2);
}
.issue-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}
.issue-empty small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.issue-items {
  list-style: none;
  margin: 0;
  padding: 2px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.issue-item button {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.issue-item button:hover {
  border-color: var(--kiosk-primary);
}

.issue-item.active button {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.18);
}
.issue-item.item-failed button {
  border-left: 3px solid var(--kiosk-danger);
}
.issue-item.item-attention button {
  border-left: 3px solid var(--kiosk-warning);
}

.issue-item-icon {
  font-size: 18px;
  flex: 0 0 auto;
  display: flex;
  padding-top: 2px;
}
.item-failed .issue-item-icon {
  color: var(--kiosk-danger);
}
.item-attention .issue-item-icon {
  color: var(--kiosk-warning);
}

.issue-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.issue-item-text strong {
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.issue-item-text span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  word-break: break-all;
}
.issue-item-text small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

/* ============ 中：大画布预览 ============ */

.preview-wrap {
  display: flex;
  min-height: 0;
}

.preview-canvas {
  position: relative;
  flex: 1;
  background: var(--kiosk-canvas);
  border-radius: var(--kiosk-radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--kiosk-shadow-2);
}

.preview-image {
  max-width: calc(100% - var(--kiosk-space-6) * 2);
  max-height: calc(100% - var(--kiosk-space-6) * 2);
  background: #fff;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
  user-select: none;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-5);
  color: var(--kiosk-ink-on-canvas);
}
.preview-empty-icon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: var(--kiosk-space-2);
}
.preview-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-medium);
}
.preview-empty small {
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-on-canvas-secondary);
}

.preview-banner {
  position: absolute;
  top: var(--kiosk-space-4);
  left: var(--kiosk-space-4);
  right: var(--kiosk-space-4);
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-2) var(--kiosk-space-4);
  background: rgba(20, 27, 45, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-on-canvas);
  backdrop-filter: blur(8px);
}
.banner-no {
  font-family: var(--kiosk-font-mono);
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-warning);
}
.banner-title {
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
}
.banner-desc {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-on-canvas-secondary);
  flex: 1;
  min-width: 0;
}

/* ============ 右：操作面板 ============ */

.actions-panel {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  min-height: 0;
  overflow-y: auto;
}

.panel-section {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.panel-section header h4 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
  letter-spacing: 0.04em;
}

.op-btn {
  height: var(--kiosk-h-action-md);
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-primary);
  cursor: pointer;
  transition:
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.op-btn:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
}
.op-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.op-btn--danger {
  background: var(--kiosk-danger-soft);
  border-color: rgba(197, 38, 62, 0.3);
  color: var(--kiosk-danger);
}
.op-btn--danger:hover:not(:disabled) {
  border-color: var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
}

.op-btn--danger-ghost {
  color: var(--kiosk-danger);
}
.op-btn--danger-ghost:hover:not(:disabled) {
  border-color: var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
}

/* ============ 批次摘要 KV ============ */

.summary-kv {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}
.summary-kv > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
}
.summary-kv dt {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.summary-kv dd {
  margin: 0;
  font-family: var(--kiosk-font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  text-align: right;
  word-break: break-all;
}
.summary-kv .mono {
  font-family: var(--kiosk-font-mono);
}

.ledger-error {
  margin-top: var(--kiosk-space-2);
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
}

@media (max-width: 1280px) {
  .review-stage {
    grid-template-columns: 280px minmax(0, 1fr) 240px;
  }
}
@media (max-width: 1024px) {
  .review-stage {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .actions-panel {
    display: none;
  }
}
</style>
