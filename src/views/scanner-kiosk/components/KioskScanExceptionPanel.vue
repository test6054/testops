<script setup lang="ts">
import type { ExamCandidateResponse } from '@/apis/mark/exam-scope'
import { CandidateStatusDescription } from '@/apis/mark/exam-scope'
/**
 * 扫描中异常修正面板：边扫边处理，占用缩略图列（非遮罩叠加）。
 */
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { LocalScanPageStatusCode } from '@/apis/mark/scanner-agent-local'
import { bindScannerKioskPaper, pageScannerKioskExamRoster } from '@/apis/mark/scanner-kiosk'
import { TaskStatusDescription } from '@/apis/mark/task-status'
import { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import { getKioskBindingProfile } from '@/utils/kiosk-auth'
import { strictEnumLabel } from '@/utils/strict-enum'
import { useKioskCtx } from '../composables/kioskInjection'

const props = defineProps<{
  open: boolean
  pageNo?: number
  /** 无 pageId 的 BINDING_CONFLICT 待办须显式传入 paperInstanceId */
  paperInstanceId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { workflow, stage } = useKioskCtx()

const studentNo = ref('')
const candidateRosterId = ref('')
const candidateKeyword = ref('')
const candidates = ref<ExamCandidateResponse[]>([])
const candidateCache = ref<Map<string, ExamCandidateResponse>>(new Map())
const candidatesLoading = ref(false)
const candidatesLoadError = ref('')
const binding = ref(false)

const currentPage = computed(() => {
  if (props.pageNo == null || props.pageNo <= 0) return null
  return workflow.visiblePages.value.find((p) => p.pageNo === props.pageNo) ?? null
})

const ledgerItem = computed(() => {
  if (props.pageNo == null || props.pageNo <= 0) return null
  return workflow.pageLedger.value?.items.find((item) => item.pageNo === props.pageNo) ?? null
})

const pageTitle = computed(() => {
  const pageNo = props.pageNo
  if (pageNo != null && pageNo > 0) {
    return workflow.scanPageDisplayTitleByNo(pageNo)
  }
  if (props.paperInstanceId) return `答卷 ${props.paperInstanceId}`
  return '身份绑定'
})

const scanBatchId = computed(
  () =>
    workflow.currentJob.value?.scanBatchId ||
    workflow.pageLedger.value?.scanBatchId ||
    workflow.boundPaperScanBatchId.value ||
    '',
)

/** 优先显式 paperInstanceId；否则通过页级 localPageId 与 attentionItems.pageId 精确关联。 */
const resolvedPaperInstanceId = computed(() => {
  if (props.paperInstanceId) return props.paperInstanceId
  const ledger = workflow.pageLedger.value
  const localPageId = ledgerItem.value?.localPageId
  if (!ledger || !localPageId) return undefined
  const hit = ledger.attentionItems.find((item) => item.pageId === localPageId)
  return hit?.paperInstanceId
})

const attentionItem = computed(() => {
  const ledger = workflow.pageLedger.value
  if (!ledger) return undefined
  if (props.paperInstanceId) {
    return ledger.attentionItems.find((item) => item.paperInstanceId === props.paperInstanceId)
  }
  const localPageId = ledgerItem.value?.localPageId
  if (!localPageId) return undefined
  return ledger.attentionItems.find((item) => item.pageId === localPageId)
})

const processingStatusText = computed(() => {
  const status = attentionItem.value?.processingStatus
  if (!status) return ''
  return strictEnumLabel(TaskStatusDescription, status, '处理任务状态')
})

const attentionTypeLabel = computed(() => {
  const attentionType = ledgerItem.value?.attentionType || attentionItem.value?.attentionType
  if (!attentionType) return ''
  return workflow.attentionTypeText(attentionType)
})

const canBindCandidate = computed(() =>
  Boolean(scanBatchId.value && resolvedPaperInstanceId.value && workflow.examId.value),
)

const diagnosticText = computed(() => {
  if (currentPage.value?.diagnostic) {
    return workflow.scannerDiagnosticText(currentPage.value.diagnostic)
  }
  if (attentionItem.value?.diagnostic) return attentionItem.value.diagnostic
  if (ledgerItem.value?.attentionMessage) return ledgerItem.value.attentionMessage
  if (ledgerItem.value?.attentionType) {
    return workflow.attentionTypeText(ledgerItem.value.attentionType)
  }
  if (attentionItem.value?.attentionType) {
    return workflow.attentionTypeText(attentionItem.value.attentionType)
  }
  if (currentPage.value?.status === LocalScanPageStatusCode.FAILED)
    return '页面上传失败，系统后台自动重试上传中'
  return '页面处理异常，请核对影像与考号'
})

const showRetryUpload = computed(() => currentPage.value?.status === LocalScanPageStatusCode.FAILED)

function isCandidateBindable(candidate: ExamCandidateResponse): boolean {
  return candidate.status === CandidateStatusCode.ACTIVE
}

function candidateStatusLabel(status: CandidateStatusCode | undefined): string {
  if (!status || !CandidateStatusDescription[status]) return '状态异常'
  return CandidateStatusDescription[status]
}

function candidateBindingBlockReason(rosterId: string): string {
  if (!rosterId.trim()) return '请从名册中选择正确考生'
  const candidate =
    candidateCache.value.get(rosterId) ??
    candidates.value.find((item) => item.candidateRosterId === rosterId)
  if (!candidate) return '所选考生不在当前考试名册中，请刷新名册后重试'
  if (!isCandidateBindable(candidate)) {
    return `${candidate.studentName}（${candidate.studentNo}）当前状态为${candidateStatusLabel(candidate.status)}，不能绑定试卷`
  }
  return ''
}

let candidateSearchTimer: ReturnType<typeof setTimeout> | null = null
function onCandidateKeywordInput(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  candidateKeyword.value = event.target.value
  if (candidateSearchTimer) clearTimeout(candidateSearchTimer)
  candidateSearchTimer = setTimeout(() => void loadCandidates(candidateKeyword.value), 300)
}

async function loadCandidates(keyword?: string) {
  const examId = workflow.examId.value
  const profile = getKioskBindingProfile()
  if (!examId) {
    candidatesLoadError.value = '考试未绑定，无法加载考生名册'
    return
  }
  if (!profile) {
    candidatesLoadError.value = '工位设备身份缺失，请重新完成一体机激活'
    return
  }
  candidatesLoading.value = true
  candidatesLoadError.value = ''
  try {
    const page = await pageScannerKioskExamRoster({
      examId,
      scannerDeviceId: profile.scannerDeviceId,
      scannerStationId: profile.scannerStationId,
      pageNum: 1,
      pageSize: 20,
      keyword: keyword?.trim() || undefined,
    })
    for (const item of page.list) {
      candidateCache.value.set(item.candidateRosterId, item)
    }
    candidates.value = page.list
  } catch (error) {
    candidates.value = []
    candidatesLoadError.value = error instanceof Error ? error.message : '考生名册加载失败'
    workflow.errorMessage.value = candidatesLoadError.value
  } finally {
    candidatesLoading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    studentNo.value = ''
    candidateRosterId.value = ''
    candidateKeyword.value = ''
    void loadCandidates()
    void workflow.refreshPageLedger()
  },
)

function onCandidateChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) {
    return
  }
  const rosterId = event.target.value
  candidateRosterId.value = rosterId
  const hit = candidates.value.find((c) => c.candidateRosterId === rosterId)
  if (hit) studentNo.value = hit.studentNo
}

async function submitBind() {
  if (!canBindCandidate.value) return
  const examId = workflow.examId.value
  const profile = getKioskBindingProfile()
  if (!examId || !profile) return
  const blockReason = candidateBindingBlockReason(candidateRosterId.value)
  if (blockReason) {
    workflow.errorMessage.value = blockReason
    return
  }
  binding.value = true
  workflow.errorMessage.value = ''
  try {
    await bindScannerKioskPaper({
      scannerDeviceId: profile.scannerDeviceId,
      scannerStationId: profile.scannerStationId,
      examId,
      scanBatchId: scanBatchId.value,
      paperInstanceId: resolvedPaperInstanceId.value!,
      recognizedStudentNo: studentNo.value.trim() || undefined,
      confirmedCandidateRosterId: candidateRosterId.value,
      attemptStatus: AttemptStatusCode.NORMAL,
    })
    workflow.successMessage.value = '考号已修正并绑定'
    await workflow.refreshPageLedger()
    await workflow.refreshBoundPapers()
    emit('close')
  } catch (error) {
    workflow.errorMessage.value = error instanceof Error ? error.message : '考号绑定失败'
  } finally {
    binding.value = false
  }
}

function retryUpload() {
  void workflow.retryCurrentUpload()
}

function gotoReview() {
  emit('close')
  if (!workflow.currentJob.value) {
    stage.gotoStage('review')
  }
}
</script>

<template>
  <aside v-if="open" class="exception-panel" aria-label="异常修正面板">
    <header class="exception-panel__head">
      <h4>{{ pageTitle }} · 异常修正</h4>
      <button type="button" class="exception-panel__close" title="关闭" @click="emit('close')">
        <CloseOutlined />
      </button>
    </header>

    <p class="exception-panel__diag">{{ diagnosticText }}</p>

    <div v-if="attentionTypeLabel" class="exception-panel__meta">
      <span>{{ attentionTypeLabel }}</span>
      <small v-if="ledgerItem">{{
        workflow.registrationStatusText(ledgerItem.registrationStatus)
      }}</small>
      <small v-if="processingStatusText">处理任务：{{ processingStatusText }}</small>
    </div>

    <div v-if="canBindCandidate" class="exception-panel__form">
      <label class="field">
        <span>考号 / 学号</span>
        <input
          v-model="studentNo"
          type="text"
          class="field__input"
          placeholder="选择名册后自动填充"
        />
      </label>
      <label class="field">
        <span>搜索考生</span>
        <input
          v-model="candidateKeyword"
          type="text"
          class="field__input"
          placeholder="考号 / 姓名"
          @input="onCandidateKeywordInput"
        />
      </label>
      <label class="field">
        <span>名册考生（必选）</span>
        <select
          v-model="candidateRosterId"
          class="field__input"
          :disabled="candidatesLoading"
          @change="onCandidateChange"
        >
          <option value="">请选择考生</option>
          <option
            v-for="c in candidates"
            :key="c.candidateRosterId"
            :value="c.candidateRosterId"
            :disabled="!isCandidateBindable(c)"
          >
            {{ c.studentNo }} · {{ c.studentName }}（{{ c.className || '未分班' }}）
          </option>
        </select>
      </label>
      <p v-if="candidatesLoadError" class="exception-panel__error">{{ candidatesLoadError }}</p>
      <button type="button" class="action-primary" :disabled="binding" @click="submitBind">
        确认考号并绑定
      </button>
    </div>
    <p v-else-if="attentionItem || ledgerItem?.attentionType" class="exception-panel__hint">
      {{
        attentionItem?.paperInstanceId
          ? '当前批次或考试上下文未就绪，刷新账本后再绑定。'
          : '页面尚未完成落库绑定，上传完成后可在复核阶段修正考号。'
      }}
    </p>

    <div class="exception-panel__actions">
      <button v-if="showRetryUpload" type="button" class="action-secondary" @click="retryUpload">
        <ReloadOutlined />
        重试上传失败页
      </button>
      <button type="button" class="action-ghost" @click="gotoReview">前往复核 →</button>
    </div>
  </aside>
</template>

<style scoped>
.exception-panel {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}

.exception-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
}

.exception-panel__head h4 {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
}

.exception-panel__close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  cursor: pointer;
}

.exception-panel__thumb {
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  overflow: hidden;
  background: var(--kiosk-canvas);
}

.exception-panel__thumb img {
  display: block;
  width: 100%;
  height: auto;
}

.exception-panel__diag {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.exception-panel__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
}

.exception-panel__form {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.field__input {
  height: var(--kiosk-h-input-sm);
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
}

.exception-panel__error {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-danger);
}

.action-primary,
.action-secondary,
.action-ghost {
  height: var(--kiosk-h-action-md);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}

.action-primary {
  background: var(--kiosk-primary);
  border: none;
  color: #fff;
}

.action-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  background: var(--kiosk-warning-soft);
  border: 1px solid var(--kiosk-warning);
  color: var(--kiosk-ink-primary);
}

.action-ghost {
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.exception-panel__hint {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.exception-panel__actions {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  margin-top: auto;
}
</style>
