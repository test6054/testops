<script setup lang="ts">
import type { TaskStatusCode } from '@/apis/mark/task-status'
/**
 * Stage 3 - 澶嶆牳涓庡紓甯稿缃?
 *
 * 涓氬姟瀹氫綅锛歝urrentJob 瀛樺湪涓斿寘鍚紓甯?/ 澶辫触椤碉紝鎴栬€呬笂浼?commit 鍗′綇銆?
 * 涓夋爮甯冨眬锛?
 *   宸?320px  路 寮傚父鍒楄〃锛團AILED 椤?+ attentionItems锛?
 *   涓?flex   路 閫変腑椤瑰ぇ鐢诲竷棰勮
 *   鍙?280px  路 鎿嶄綔闈㈡澘锛堥噸璇?/ 鍒犻櫎 / 绉婚櫎 / 鍒锋柊锛? 鎵规鎽樿
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
import { computed, ref, watch } from 'vue'
import { LocalScanPageStatusCode } from '@/apis/mark/scanner-agent-local'
import { TaskStatusDescription } from '@/apis/mark/task-status'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { ExamScannerPageRegistrationStatusCode } from '@/types/enums/exam-scanner-page-registration-status-enum'
import { ScanAttentionTypeCode } from '@/types/enums/scan-attention-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import KioskBoundStudentsPanel from '../components/KioskBoundStudentsPanel.vue'
import KioskScanExceptionPanel from '../components/KioskScanExceptionPanel.vue'
import KioskScanSessionStrip from '../components/KioskScanSessionStrip.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

interface ReviewItem {
  key: string
  pageNo: number
  type: 'page-failed' | 'attention' | 'page-registered'
  title: string
  description: string
  detail?: string
  status?: string
  processingStatus?: TaskStatusCode
  source: 'job' | 'ledger'
  localPageId?: string
  paperInstanceId?: string
  attentionType?: ScanAttentionTypeCode
}

const selectedBindingPaperInstanceId = ref('')

/** 澶辫触椤碉紙鐩存帴浠?currentJob.pages 涓瓫閫夛級 */
const failedPages = computed<ReviewItem[]>(() =>
  workflow.exceptionPages.value.map((page): ReviewItem => ({
    key: `page-${page.pageNo}`,
    pageNo: page.pageNo,
    type: 'page-failed',
    title: workflow.scanPageDisplayTitleByNo(page.pageNo),
    description: page.status === LocalScanPageStatusCode.FAILED ? '上传失败' : '页处理异常',
    detail:
      typeof page.diagnostic === 'string'
        ? workflow.scannerDiagnosticText(page.diagnostic)
        : undefined,
    status: page.status,
    source: 'job',
  })),
)

/** 账本页级异常待办；回填 attentionItems 的 paperInstanceId，供身份绑定处置入口。 */
const ledgerAttentions = computed<ReviewItem[]>(() => {
  const ledger = workflow.pageLedger.value
  if (!ledger) return []
  const ledgerItems = ledger.items.filter((item) => Boolean(item.attentionType))
  return ledgerItems.map((item): ReviewItem => {
    const linkedAttention = ledger.attentionItems.find((att) => att.pageId === item.localPageId)
    return {
      key: `ledger-${workflow.ledgerItemKey(item)}`,
      pageNo: item.pageNo,
      type: 'attention',
      title: `${workflow.scanPageDisplayTitleByNo(item.pageNo)} · ${workflow.attentionTypeText(item.attentionType!)}`,
      description:
        item.attentionMessage || workflow.registrationStatusText(item.registrationStatus),
      detail: item.operatorName
        ? `操作人 ${item.operatorName} · ${workflow.formatTime(item.occurredAt)}`
        : workflow.formatTime(item.occurredAt),
      processingStatus: linkedAttention?.processingStatus,
      source: 'ledger',
      localPageId: item.localPageId,
      paperInstanceId: linkedAttention?.paperInstanceId,
      attentionType: item.attentionType!,
    }
  })
})

/** 账本 attentionItems（如身份绑定冲突），与 items.attentionType 互补；无 pageId 的 BINDING_CONFLICT 仍须展示。 */
const ledgerAttentionTodos = computed<ReviewItem[]>(() => {
  const ledger = workflow.pageLedger.value
  if (!ledger?.attentionItems.length) return []
  const items: ReviewItem[] = []
  for (const att of ledger.attentionItems) {
    const pageItem = att.pageId
      ? ledger.items.find((item) => item.localPageId === att.pageId)
      : undefined
    const pageNo = pageItem?.pageNo ?? 0
    const bindingConflictWithoutPage
      = !att.pageId && att.attentionType === ScanAttentionTypeCode.BINDING_CONFLICT
    if (pageNo <= 0 && !bindingConflictWithoutPage) continue
    const titlePrefix
      = pageNo > 0
        ? workflow.scanPageDisplayTitleByNo(pageNo)
        : att.paperInstanceId
          ? `答卷 ${att.paperInstanceId}`
          : '答卷标识缺失'
    items.push({
      key: `attention-${att.id}`,
      pageNo,
      type: 'attention',
      title: `${titlePrefix} · ${workflow.attentionTypeText(att.attentionType)}`,
      description:
        att.diagnostic
        || workflow.registrationStatusText(
          pageItem?.registrationStatus ?? ExamScannerPageRegistrationStatusCode.PENDING,
        ),
      detail: workflow.formatTime(att.updateTime),
      processingStatus: att.processingStatus,
      source: 'ledger',
      localPageId: att.pageId,
      paperInstanceId: att.paperInstanceId,
      attentionType: att.attentionType,
    })
  }
  return items
})

function processingStatusLabel(status?: TaskStatusCode) {
  if (!status) return ''
  return strictEnumLabel(TaskStatusDescription, status, '处理任务状态')
}

const reviewItems = computed(() => {
  const merged = [...failedPages.value, ...ledgerAttentions.value, ...ledgerAttentionTodos.value]
  const seen = new Set<string>()
  return merged.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
})

/** 鏈壒娆″凡鐧昏鐨勫叏閮ㄩ〉闈紙鍚崏绋跨焊绛夐檮鍔犻〉锛夛紝渚涘鏍搁樁娈垫祻瑙堝奖鍍忥紝涓庡紓甯稿緟鍔炲苟鍒楀睍绀恒€? */
const registeredPages = computed<ReviewItem[]>(() => {
  const ledger = workflow.pageLedger.value
  if (!ledger?.items.length) return []
  const issuePageNos = new Set(
    reviewItems.value.filter((item) => item.pageNo > 0).map((item) => item.pageNo),
  )
  return ledger.items
    .filter(
      (item) =>
        item.registrationStatus !== ExamScannerPageRegistrationStatusCode.DISCARDED
        && item.registrationStatus !== ExamScannerPageRegistrationStatusCode.SUPERSEDED,
    )
    .filter((item) => !issuePageNos.has(item.pageNo))
    .map((item): ReviewItem => ({
      key: `registered-${workflow.ledgerItemKey(item)}`,
      pageNo: item.pageNo,
      type: 'page-registered',
      title: workflow.scanPageDisplayTitleByNo(item.pageNo),
      description: workflow.registrationStatusText(item.registrationStatus),
      detail: item.operatorName
        ? `鎿嶄綔浜?${item.operatorName} 路 ${workflow.formatTime(item.occurredAt)}`
        : workflow.formatTime(item.occurredAt),
      source: 'ledger',
      localPageId: item.localPageId,
    }))
})

const selectedItem = computed<ReviewItem | null>(() => {
  if (selectedBindingPaperInstanceId.value) {
    return (
      reviewItems.value.find(
        (item) => item.paperInstanceId === selectedBindingPaperInstanceId.value,
      ) ?? null
    )
  }
  if (!workflow.previewPageNo.value) return null
  const pageNo = workflow.previewPageNo.value
  return (
    reviewItems.value.find((item) => item.pageNo === pageNo)
    ?? registeredPages.value.find((item) => item.pageNo === pageNo)
    ?? localBrowsablePages.value.find((item) => item.pageNo === pageNo)
    ?? null
  )
})

const showBindingPanel = computed(
  () =>
    selectedItem.value?.attentionType === ScanAttentionTypeCode.BINDING_CONFLICT
    && Boolean(selectedItem.value?.paperInstanceId),
)

function isReviewItemActive(item: ReviewItem): boolean {
  if (item.paperInstanceId && item.pageNo <= 0) {
    return selectedBindingPaperInstanceId.value === item.paperInstanceId
  }
  return workflow.previewPageNo.value === item.pageNo
}

function selectItem(item: ReviewItem) {
  if (item.paperInstanceId && item.pageNo <= 0) {
    selectedBindingPaperInstanceId.value = item.paperInstanceId
    workflow.previewPageNo.value = 0
    return
  }
  selectedBindingPaperInstanceId.value
    = item.attentionType === ScanAttentionTypeCode.BINDING_CONFLICT
      ? (item.paperInstanceId ?? '')
      : ''
  workflow.previewPageNo.value = item.pageNo
}

function onBindingPanelClose() {
  selectedBindingPaperInstanceId.value = ''
}

const selectedPreviewTitle = computed(() => {
  if (!selectedItem.value) return ''
  if (selectedItem.value.pageNo > 0) {
    return workflow.scanPageDisplayTitleByNo(selectedItem.value.pageNo)
  }
  return selectedItem.value.title
})
const localBrowsablePages = computed<ReviewItem[]>(() => {
  const job = workflow.reviewScanJob.value
  if (!job) return []
  const issuePageNos = new Set(reviewItems.value.map((item) => item.pageNo))
  const registeredPageNos = new Set(registeredPages.value.map((item) => item.pageNo))
  return job.pages
    .filter((page) => page.status !== LocalScanPageStatusCode.DELETED)
    .filter((page) => !issuePageNos.has(page.pageNo) && !registeredPageNos.has(page.pageNo))
    .map((page): ReviewItem => ({
      key: `local-${page.pageNo}`,
      pageNo: page.pageNo,
      type: 'page-registered',
      title: workflow.scanPageDisplayTitleByNo(page.pageNo),
      description: page.status === LocalScanPageStatusCode.UPLOADED ? '本机已上传' : '本机已扫描',
      detail: page.uploadedFileId ? `鏂囦欢 ${page.uploadedFileId}` : undefined,
      status: page.status,
      source: 'job',
    }))
})

const browsablePageCount = computed(
  () => registeredPageCount.value + localBrowsablePages.value.length,
)

/** 杩涘叆澶嶆牳闃舵鎴栭〉鍒楄〃鍙樺寲鏃讹紝榛樿閫変腑棣栨潯鍙祻瑙堥」 */
watch(
  [reviewItems, registeredPages, localBrowsablePages],
  ([issues, pages, localPages]) => {
    if (issues.length === 0 && pages.length === 0 && localPages.length === 0) {
      workflow.previewPageNo.value = 0
      selectedBindingPaperInstanceId.value = ''
      return
    }
    if (selectedBindingPaperInstanceId.value) {
      const stillExists = issues.some(
        (item) => item.paperInstanceId === selectedBindingPaperInstanceId.value,
      )
      if (stillExists) return
      selectedBindingPaperInstanceId.value = ''
    }
    const currentPageNo = workflow.previewPageNo.value
    const browsable = [...issues, ...pages, ...localPages]
    if (currentPageNo > 0 && browsable.some((item) => item.pageNo === currentPageNo)) {
      return
    }
    const first = issues[0] ?? pages[0] ?? localPages[0]
    if (first.paperInstanceId && first.pageNo <= 0) {
      selectedBindingPaperInstanceId.value = first.paperInstanceId
      workflow.previewPageNo.value = 0
      return
    }
    selectedBindingPaperInstanceId.value = ''
    workflow.previewPageNo.value = first.pageNo
  },
  { immediate: true },
)

function discardSelected() {
  if (!selectedItem.value || selectedItem.value.source !== 'ledger') return
  if (selectedItem.value.pageNo <= 0 || !selectedItem.value.localPageId) return
  if (!workflow.canDiscardLedgerPage.value) return
  workflow.discardLedgerPage({
    pageNo: selectedItem.value.pageNo,
    localPageId: selectedItem.value.localPageId,
  })
}

const job = computed(() => workflow.reviewScanJob.value)
const batch = computed(() => workflow.kioskContext.value?.latestBatch ?? null)

const totalIssues = computed(() => reviewItems.value.length)
const failedCount = computed(() => failedPages.value.length)
const attentionCount = computed(
  () => ledgerAttentions.value.length + ledgerAttentionTodos.value.length,
)
const registeredPageCount = computed(() => registeredPages.value.length)

const reviewBoundBatchId = computed(
  () => workflow.boundPaperScanBatchId.value || batch.value?.scanBatchId || '',
)

const registerProgressText = computed(() => {
  const latest = workflow.kioskContext.value?.latestBatch
  if (!latest || latest.pageCount <= 0) return ''
  const registered = latest.registeredPageCount ?? latest.receivedPageCount ?? 0
  return `已登记 ${registered} / ${latest.pageCount} 页`
})
</script>

<template>
  <section class="review-stage">
    <KioskScanSessionStrip class="review-strip" />

    <UiAlertStrip
      v-if="workflow.pageRegisterPending.value && registerProgressText"
      tone="warning"
      dense
      :closable="false"
      title="页登记处理中"
      :description="registerProgressText"
      class="review-register-progress"
    >
      <template #actions>
        <button
          type="button"
          class="op-btn op-btn--warn"
          :disabled="
            !workflow.canRetryPageRegister.value || workflow.pageRegisterRetryLoading.value
          "
          @click="workflow.retryPageRegister()"
        >
          <ReloadOutlined :spin="workflow.pageRegisterRetryLoading.value" />
          <span>重试页登记</span>
        </button>
      </template>
    </UiAlertStrip>

    <!-- 宸︼細寮傚父鍒楄〃 -->
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
            'active': isReviewItemActive(item),
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
              <small v-if="item.processingStatus">处理任务：{{ processingStatusLabel(item.processingStatus) }}</small>
              <small v-if="item.detail">{{ item.detail }}</small>
            </div>
          </button>
        </li>
      </ul>

      <section v-if="registeredPageCount > 0" class="registered-pages">
        <header class="registered-head">
          <h4>已登记页面 ({{ registeredPageCount }})</h4>
          <small>含答题页与附加页（如草稿纸），均可预览</small>
        </header>
        <ul class="issue-items registered-items">
          <li
            v-for="item in registeredPages"
            :key="item.key"
            class="issue-item item-registered"
            :class="{ active: workflow.previewPageNo.value === item.pageNo }"
          >
            <button type="button" @click="selectItem(item)">
              <div class="issue-item-icon">
                <FileTextOutlined />
              </div>
              <div class="issue-item-text">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
                <small v-if="item.detail">{{ item.detail }}</small>
              </div>
            </button>
          </li>
        </ul>
      </section>
      <section v-if="localBrowsablePages.length > 0" class="registered-pages">
        <header class="registered-head">
          <h4>本机影像 ({{ localBrowsablePages.length }})</h4>
          <small>账本未返回时仍可从本机扫描服务预览已扫描页</small>
        </header>
        <ul class="issue-items registered-items">
          <li
            v-for="item in localBrowsablePages"
            :key="item.key"
            class="issue-item item-registered"
            :class="{ active: workflow.previewPageNo.value === item.pageNo }"
          >
            <button type="button" @click="selectItem(item)">
              <div class="issue-item-icon">
                <FileTextOutlined />
              </div>
              <div class="issue-item-text">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
                <small v-if="item.detail">{{ item.detail }}</small>
              </div>
            </button>
          </li>
        </ul>
      </section>
    </aside>

    <!-- 涓細澶х敾甯冮瑙? -->
    <main class="preview-wrap">
      <div class="preview-canvas">
        <div
          v-if="!workflow.reviewScanJob.value && totalIssues === 0 && browsablePageCount === 0"
          class="preview-empty"
        >
          <FileTextOutlined class="preview-empty-icon" />
          <p>批次结束后显示复核内容</p>
          <small>当前仍在扫描中，结束批次后才能查看本地图像与复核项</small>
        </div>
        <div v-else-if="!selectedItem" class="preview-empty">
          <FileTextOutlined class="preview-empty-icon" />
          <p v-if="totalIssues > 0">请在左侧选择待复核项查看影像</p>
          <p v-else>无可预览影像</p>
          <small v-if="totalIssues > 0">点击列表条目展示对应页面</small>
        </div>
        <div v-else-if="selectedItem.pageNo <= 0" class="preview-empty">
          <WarningFilled class="preview-empty-icon" />
          <p>身份绑定冲突无关联扫描页</p>
          <small>请在右侧面板从考生名册确认身份并绑定</small>
        </div>
        <div v-else-if="!workflow.previewImageUrl.value" class="preview-empty">
          <FileTextOutlined class="preview-empty-icon" />
          <p>影像未就绪</p>
          <small v-if="workflow.previewLoadError.value">{{
            workflow.previewLoadError.value
          }}</small>
          <small v-else>{{ selectedPreviewTitle }}尚未生成或已删除</small>
        </div>
        <img
          v-else
          class="preview-image"
          :src="workflow.previewImageUrl.value"
          :alt="selectedPreviewTitle"
          draggable="false"
          @error="workflow.onPreviewImageLoadError"
        />

        <!-- 閫変腑椤规诞鍔ㄤ俊鎭潯 -->
        <div v-if="selectedItem" class="preview-banner">
          <span class="banner-no">{{ selectedPreviewTitle }}</span>
          <span class="banner-title">{{ selectedItem.title }}</span>
          <span class="banner-desc">{{ selectedItem.description }}</span>
        </div>
      </div>
    </main>

    <!-- 鍙筹細鎿嶄綔闈㈡澘 + 鎵规鎽樿 -->
    <aside class="actions-panel">
      <KioskBoundStudentsPanel
        variant="panel"
        class="panel-bound"
        :scan-batch-id="reviewBoundBatchId"
      />

      <KioskScanExceptionPanel
        v-if="showBindingPanel"
        :open="showBindingPanel"
        :page-no="selectedItem?.pageNo && selectedItem.pageNo > 0 ? selectedItem.pageNo : undefined"
        :paper-instance-id="selectedItem?.paperInstanceId"
        @close="onBindingPanelClose"
      />

      <section class="panel-section">
        <header><h4>处置操作</h4></header>
        <UiAlertStrip
          v-if="workflow.pageRegisterBlocked.value || workflow.pageRegisterPending.value"
          :tone="workflow.pageRegisterBlocked.value ? 'error' : 'warning'"
          dense
          :closable="false"
          :title="workflow.pageRegisterBlocked.value ? '自动页登记被阻断' : '页登记处理中'"
          :description="workflow.pageRegisterDiagnostic.value || '批次已提交，但页登记尚未完成'"
          class="page-register-alert"
        >
          <template v-if="workflow.pageRegisterPending.value && registerProgressText" #default>
            {{ registerProgressText }}
          </template>
          <template #actions>
            <button
              type="button"
              class="op-btn op-btn--warn"
              :disabled="
                !workflow.canRetryPageRegister.value || workflow.pageRegisterRetryLoading.value
              "
              @click="workflow.retryPageRegister()"
            >
              <ReloadOutlined :spin="workflow.pageRegisterRetryLoading.value" />
              <span>重试页登记</span>
            </button>
          </template>
        </UiAlertStrip>
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
            workflow.canRetryCommit.value ? '所有页已上传，重新触发批次提交' : '不满足重试提交条件'
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
              || selectedItem.pageNo <= 0
              || !selectedItem.localPageId
              || !workflow.canDiscardLedgerPage.value
          "
          :title="
            selectedItem
              ? selectedItem.pageNo <= 0
                ? '无关联扫描页的身份绑定冲突不能废弃页'
                : selectedItem.source === 'ledger'
                  ? '将选中项标记为废弃，需要补扫'
                  : '失败页可走重试上传，不需要废弃'
              : '请先在左侧选择待复核项'
          "
          @click="discardSelected"
        >
          <DeleteOutlined />
          <span>废弃选中项</span>
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
            <dd>{{ workflow.localScanJobStatusText(job.status) }}</dd>
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
            <dd>{{ batch.batchExternalNo }}</dd>
          </div>
        </dl>
      </section>
    </aside>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.review-stage {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--kiosk-space-3);
  height: 100%;
  min-height: 0;
}

.review-strip {
  grid-column: 1 / -1;
}

.review-register-progress {
  grid-column: 1 / -1;
}

.review-register-progress :deep(.ui-alert-strip) {
  background: var(--kiosk-warning-soft);
  border-color: color-mix(in srgb, var(--kiosk-warning) 45%, var(--kiosk-divider));
}

.panel-bound {
  flex-shrink: 0;
}

/* ============ 宸︼細寮傚父鍒楄〃 ============ */

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
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kiosk-primary) 18%, transparent);
}
.issue-item.item-failed button {
  border-color: var(--kiosk-danger);
  background: color-mix(in srgb, var(--kiosk-danger) 10%, var(--dp-bg-container));
}
.issue-item.item-attention button {
  border-color: var(--kiosk-warning);
  background: color-mix(in srgb, var(--kiosk-warning) 12%, var(--dp-bg-container));
}

.issue-item-icon {
  font-size: var(--dp-font-size-xl);
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
.item-registered .issue-item-icon {
  color: var(--kiosk-primary);
}

.registered-pages {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border-top: 1px solid var(--kiosk-divider);
  padding-top: var(--kiosk-space-2);
}
.registered-head h4 {
  margin: 0;
  font-size: var(--dp-font-size-md);
}
.registered-head small {
  color: var(--kiosk-text-secondary);
}
.registered-items {
  overflow: auto;
  flex: 1;
  min-height: 0;
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

/* ============ 涓細澶х敾甯冮瑙?============ */

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
  background: var(--kiosk-surface);
  box-shadow: var(--kiosk-shadow-3);
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
  background: var(--kiosk-canvas-soft);
  border: 1px solid color-mix(in srgb, var(--kiosk-ink-on-canvas) 14%, transparent);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-on-canvas);
}
.banner-no {
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

/* ============ 鍙筹細鎿嶄綔闈㈡澘 ============ */

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
  border-color: color-mix(in srgb, var(--kiosk-danger) 30%, transparent);
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

.page-register-block {
  margin-bottom: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  border: 1px solid color-mix(in srgb, var(--kiosk-warning) 35%, transparent);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-warning-soft);
}
.page-register-block__title {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-warning);
}
.page-register-block__desc {
  margin: 0 0 var(--kiosk-space-3);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  line-height: 1.5;
}
.op-btn--warn {
  border-color: color-mix(in srgb, var(--kiosk-warning) 45%, var(--kiosk-divider));
  color: var(--kiosk-warning);
}

/* ============ 鎵规鎽樿 KV ============ */

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
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  text-align: right;
  word-break: break-all;
}

@media (max-width: bp.$shell-laptop-max) {
  .review-stage {
    grid-template-columns: 280px minmax(0, 1fr) 240px;
  }
}
@media (max-width: bp.$shell-tablet-max) {
  .review-stage {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .actions-panel {
    display: none;
  }
}
</style>
