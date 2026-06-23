<script setup lang="ts">
/**
 * 扫描中异常修正面板：边扫边处理，占用缩略图列（非遮罩叠加）。
 */
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { bindPaper } from '@/apis/mark/exam-binding'
import {
  CANDIDATE_STATUS_LABEL,
  type CandidateStatusCode,
  type ExamCandidateVO,
  listExamCandidates,
} from '@/apis/mark/exam-scope'
import { useKioskCtx } from '../composables/kioskInjection'

const props = defineProps<{
  open: boolean
  pageNo: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { workflow, stage } = useKioskCtx()

const studentNo = ref('')
const candidateRosterId = ref('')
const candidates = ref<ExamCandidateVO[]>([])
const candidatesLoading = ref(false)
const candidatesLoadError = ref('')
const binding = ref(false)

const currentPage = computed(() =>
  workflow.visiblePages.value.find((p) => p.pageNo === props.pageNo) ?? null,
)

const ledgerItem = computed(() =>
  workflow.pageLedger.value?.items.find((item) => item.pageNo === props.pageNo) ?? null,
)

const scanBatchId = computed(
  () =>
    workflow.currentJob.value?.scanBatchId
    || workflow.pageLedger.value?.scanBatchId
    || workflow.boundPaperScanBatchId.value
    || '',
)

/** 仅通过页级 localPageId 与 attentionItems.pageId 精确关联，禁止回退到首个 paperInstanceId。 */
const paperInstanceId = computed(() => {
  const ledger = workflow.pageLedger.value
  const localPageId = ledgerItem.value?.localPageId
  if (!ledger || !localPageId) return undefined
  const hit = ledger.attentionItems.find((item) => item.pageId === localPageId)
  return hit?.paperInstanceId
})

const canBindCandidate = computed(
  () => Boolean(scanBatchId.value && paperInstanceId.value && workflow.examId.value),
)

const diagnosticText = computed(() => {
  if (currentPage.value?.diagnostic) {
    return workflow.scannerDiagnosticText(currentPage.value.diagnostic)
  }
  if (ledgerItem.value?.attentionMessage) return ledgerItem.value.attentionMessage
  if (ledgerItem.value?.attentionType) {
    return workflow.attentionTypeText(ledgerItem.value.attentionType)
  }
  if (currentPage.value?.status === 'FAILED') return '页面上传失败，可重试上传后继续扫描'
  return '页面处理异常，请核对影像与考号'
})

const showRetryUpload = computed(() => currentPage.value?.status === 'FAILED')

function isCandidateBindable(candidate: ExamCandidateVO): boolean {
  return candidate.status === 'ACTIVE'
}

function candidateStatusLabel(status: CandidateStatusCode | undefined): string {
  if (!status || !CANDIDATE_STATUS_LABEL[status]) return '状态异常'
  return CANDIDATE_STATUS_LABEL[status]
}

function candidateBindingBlockReason(rosterId: string): string {
  if (!rosterId.trim()) return '请从名册中选择正确考生'
  const candidate = candidates.value.find((item) => item.candidateRosterId === rosterId)
  if (!candidate) return '所选考生不在当前考试名册中，请刷新名册后重试'
  if (!isCandidateBindable(candidate)) {
    return `${candidate.studentName}（${candidate.studentNo}）当前状态为${candidateStatusLabel(candidate.status)}，不能绑定试卷`
  }
  return ''
}

async function loadCandidates() {
  const examId = workflow.examId.value
  if (!examId) {
    candidatesLoadError.value = '考试未绑定，无法加载考生名册'
    return
  }
  candidatesLoading.value = true
  candidatesLoadError.value = ''
  try {
    candidates.value = await listExamCandidates(examId)
  } catch (error) {
    candidates.value = []
    candidatesLoadError.value =
      error instanceof Error ? error.message : '考生名册加载失败'
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
    void loadCandidates()
    void workflow.refreshPageLedger()
  },
)

function onCandidateChange(rosterId: string) {
  candidateRosterId.value = rosterId
  const hit = candidates.value.find((c) => c.candidateRosterId === rosterId)
  if (hit) studentNo.value = hit.studentNo
}

async function submitBind() {
  if (!canBindCandidate.value) return
  const examId = workflow.examId.value
  if (!examId) return
  const blockReason = candidateBindingBlockReason(candidateRosterId.value)
  if (blockReason) {
    workflow.errorMessage.value = blockReason
    return
  }
  binding.value = true
  workflow.errorMessage.value = ''
  try {
    await bindPaper({
      examId,
      scanBatchId: scanBatchId.value,
      paperInstanceId: paperInstanceId.value!,
      recognizedStudentNo: studentNo.value.trim() || undefined,
      confirmedCandidateRosterId: candidateRosterId.value,
      attemptStatus: 'NORMAL',
    })
    workflow.successMessage.value = '考号已修正并绑定'
    await workflow.refreshPageLedger()
    await workflow.refreshBoundPapers()
    emit('close')
  } catch (error) {
    workflow.errorMessage.value =
      error instanceof Error ? error.message : '考号绑定失败'
  } finally {
    binding.value = false
  }
}

function retryUpload() {
  void workflow.retryCurrentUpload()
}

function gotoReview() {
  emit('close')
  stage.gotoStage('review')
}
</script>

<template>
  <aside v-if="open" class="exception-panel" aria-label="异常修正面板">
    <header class="exception-panel__head">
      <h4>第 {{ pageNo }} 页 · 异常修正</h4>
      <button type="button" class="exception-panel__close" title="关闭" @click="emit('close')">
        <CloseOutlined />
      </button>
    </header>

    <div v-if="workflow.previewImageUrl.value" class="exception-panel__thumb">
      <img :src="workflow.previewImageUrl.value" :alt="`第 ${pageNo} 页`" />
    </div>

    <p class="exception-panel__diag">{{ diagnosticText }}</p>

    <div v-if="ledgerItem?.attentionType" class="exception-panel__meta">
      <span>{{ workflow.attentionTypeText(ledgerItem.attentionType) }}</span>
      <small>{{ workflow.registrationStatusText(ledgerItem.registrationStatus) }}</small>
    </div>

    <div v-if="canBindCandidate" class="exception-panel__form">
      <label class="field">
        <span>考号 / 学号</span>
        <input v-model="studentNo" type="text" class="field__input" placeholder="选择名册后自动填充" />
      </label>
      <label class="field">
        <span>名册考生（必选）</span>
        <select
          v-model="candidateRosterId"
          class="field__input"
          :disabled="candidatesLoading"
          @change="onCandidateChange(($event.target as HTMLSelectElement).value)"
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
    <p v-else-if="ledgerItem?.attentionType" class="exception-panel__hint">
      页面尚未完成落库绑定，上传完成后可在复核阶段修正考号。
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
