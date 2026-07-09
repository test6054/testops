<template>
  <a-spin :spinning="loading">
    <UiEmpty v-if="!loading && !inspector" description="请选择页轨条目" />
    <template v-else-if="inspector">
      <UiAlertStrip
        v-if="inspector.inspectorHint"
        tone="info"
        :closable="false"
        dense
        :description="inspector.inspectorHint"
        class="scan-batch-page-inspector__hint"
      />
      <UiAlertStrip
        v-if="inspector.exceptionSummary"
        tone="error"
        :closable="false"
        dense
        title="页级异常"
        :description="inspector.exceptionSummary"
        class="scan-batch-page-inspector__exception"
      />
      <dl class="scan-batch-page-inspector__meta">
        <div>
          <dt>进纸序</dt>
          <dd>{{ inspector.page.fileOrder }}</dd>
        </div>
        <div>
          <dt>登记状态</dt>
          <dd>{{ registerStatusLabel(inspector.page.registerStatus) }}</dd>
        </div>
        <div v-if="inspector.page.pageSeq !== undefined">
          <dt>页序</dt>
          <dd>{{ inspector.page.pageSeq }}</dd>
        </div>
        <div v-if="inspector.page.templatePageNo !== undefined">
          <dt>模板页</dt>
          <dd>{{ inspector.page.templatePageNo }}</dd>
        </div>
        <div v-if="inspector.page.fileName">
          <dt>文件名</dt>
          <dd>{{ inspector.page.fileName }}</dd>
        </div>
        <div v-if="inspector.page.qualityStatus">
          <dt>质量判定</dt>
          <dd>
            <UiTag
              :tone="strictEnumTone(QUALITY_DECISION_TONE, inspector.page.qualityStatus, '扫描页质量判定')"
              size="sm"
            >
              {{
                strictEnumLabel(
                  QualityDecisionDescription,
                  inspector.page.qualityStatus,
                  '扫描页质量判定',
                )
              }}
            </UiTag>
          </dd>
        </div>
        <div v-if="inspector.page.diagnostic">
          <dt>页级诊断</dt>
          <dd class="scan-batch-page-inspector__full-text">{{ inspector.page.diagnostic }}</dd>
        </div>
      </dl>

      <section v-if="inspector.page.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING" class="scan-batch-page-inspector__section">
        <h3 class="scan-batch-page-inspector__section-title">OCR 识别</h3>
        <dl class="scan-batch-page-inspector__meta">
          <div v-if="inspector.page.rosterMatchStatus">
            <dt>名册匹配</dt>
            <dd>
              <UiTag
                :tone="strictEnumTone(
                  ScanBatchWorkbenchRosterMatchStatusTone,
                  inspector.page.rosterMatchStatus,
                  '页轨名册匹配态',
                )"
                size="sm"
              >
                {{
                  strictEnumLabel(
                    ScanBatchWorkbenchRosterMatchStatusDescription,
                    inspector.page.rosterMatchStatus,
                    '页轨名册匹配态',
                  )
                }}
              </UiTag>
            </dd>
          </div>
          <div v-if="inspector.page.rosterMatchDiagnostic">
            <dt>匹配诊断</dt>
            <dd class="scan-batch-page-inspector__full-text">{{ inspector.page.rosterMatchDiagnostic }}</dd>
          </div>
          <div v-if="inspector.page.ocrStudentNo">
            <dt>OCR 学号</dt>
            <dd>{{ inspector.page.ocrStudentNo }}</dd>
          </div>
          <div v-if="inspector.page.ocrStudentName">
            <dt>OCR 姓名</dt>
            <dd>{{ inspector.page.ocrStudentName }}</dd>
          </div>
          <div v-if="inspector.page.ocrClassName">
            <dt>OCR 班级</dt>
            <dd>{{ inspector.page.ocrClassName }}</dd>
          </div>
          <div v-if="inspector.page.recognitionTaskStatus">
            <dt>识别任务</dt>
            <dd>
              <UiTag
                :tone="strictEnumTone(TASK_STATUS_TONE, inspector.page.recognitionTaskStatus, '识别任务状态')"
                size="sm"
              >
                {{
                  strictEnumLabel(
                    TaskStatusDescription,
                    inspector.page.recognitionTaskStatus,
                    '识别任务状态',
                  )
                }}
              </UiTag>
            </dd>
          </div>
          <div v-if="showPendingBindHint">
            <dt>绑定状态</dt>
            <dd>待绑定</dd>
          </div>
        </dl>
      </section>

      <section
        v-if="inspector.page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND || inspector.page.candidateName"
        class="scan-batch-page-inspector__section"
      >
        <h3 class="scan-batch-page-inspector__section-title">名册绑定</h3>
        <dl class="scan-batch-page-inspector__meta">
          <div v-if="inspector.page.candidateName">
            <dt>考生姓名</dt>
            <dd>{{ inspector.page.candidateName }}</dd>
          </div>
          <div v-if="inspector.page.studentNo">
            <dt>学号</dt>
            <dd>{{ inspector.page.studentNo }}</dd>
          </div>
          <div v-if="inspector.page.className">
            <dt>班级</dt>
            <dd>{{ inspector.page.className }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="showBindForm" class="scan-batch-page-inspector__section">
        <h3 class="scan-batch-page-inspector__section-title">确认身份绑定</h3>
        <p class="scan-batch-page-inspector__bind-tip">
          对照中栏登记页与 OCR 线索，从考试名册选择正确考生并确认绑定。
        </p>
        <a-form layout="vertical" class="scan-batch-page-inspector__bind-form">
          <a-form-item label="识别学号（审计留痕，可修正）">
            <a-input
              v-model:value="recognizedStudentNo"
              placeholder="OCR 学号或人工修正值"
              :maxlength="64"
            />
          </a-form-item>
          <a-form-item label="确认考生" required>
            <a-select
              v-model:value="confirmedCandidateRosterId"
              placeholder="按姓名或学号搜索名册"
              show-search
              :options="candidateOptions"
              :filter-option="false"
              :loading="candidatesLoading"
              allow-clear
              @search="searchCandidates"
            />
          </a-form-item>
          <a-form-item label="答卷状态" required>
            <a-select
              v-model:value="attemptStatus"
              :options="BINDABLE_ATTEMPT_STATUS_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="答卷编号（可选）">
            <a-input v-model:value="attemptNo" placeholder="同一考生多卷时区分" :maxlength="32" />
          </a-form-item>
          <UiButton
            variant="primary"
            size="sm"
            block
            :loading="binding"
            :disabled="!canSubmitBind"
            @click="submitBind"
          >
            确认绑定
          </UiButton>
        </a-form>
      </section>
      <UiAlertStrip
        v-else-if="showBindBlocked"
        tone="warning"
        :closable="false"
        dense
        title="无法绑定"
        description="当前页已登记但未关联试卷实例，请重试页登记或联系管理员处理。"
        class="scan-batch-page-inspector__exception"
      />
    </template>
  </a-spin>
</template>

<script lang="ts" setup>
import type { ExamScannerBatchPageInspectorVO } from '@/apis/mark/exam-scan'

import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { bindPaper } from '@/apis/mark/exam-binding'
import {
  QUALITY_DECISION_TONE,
  QualityDecisionDescription,
  ScanBatchWorkbenchRegisterStatusDescription,
  ScanBatchWorkbenchRosterMatchStatusDescription,
  ScanBatchWorkbenchRosterMatchStatusTone,
} from '@/apis/mark/exam-scan'
import { TASK_STATUS_TONE, TaskStatusDescription } from '@/apis/mark/task-status'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import {
  BINDABLE_ATTEMPT_STATUS_OPTIONS,
  useExamPaperBindCandidates,
} from '@/composables/useExamPaperBindCandidates'
import { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import {
  ScanBatchWorkbenchBindingStatusCode,
} from '@/types/enums/scan-batch-workbench-binding-status-enum'
import {
  ScanBatchWorkbenchRegisterStatusCode,
} from '@/types/enums/scan-batch-workbench-register-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ScanBatchPageInspectorPanel' })

const props = defineProps<{
  inspector: ExamScannerBatchPageInspectorVO | null
  loading?: boolean
  examId?: string
  scanBatchId?: string
}>()

const emit = defineEmits<{
  bound: []
}>()

const {
  candidateOptions,
  candidatesLoading,
  searchCandidates,
  resolveCandidateBindingBlockReason,
  resetCandidateSearch,
} = useExamPaperBindCandidates(() => props.examId)

const recognizedStudentNo = ref('')
const confirmedCandidateRosterId = ref<string | undefined>(undefined)
const attemptStatus = ref<AttemptStatusCode>(AttemptStatusCode.NORMAL)
const attemptNo = ref('')
const binding = ref(false)

const showPendingBindHint = computed(() =>
  props.inspector?.page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED
  && (props.inspector.page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.UNBOUND
    || props.inspector.page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.CONFLICT),
)

const showBindForm = computed(() => {
  const page = props.inspector?.page
  if (!page || page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING || page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return false
  }
  return Boolean(page.paperInstanceId && props.examId && props.scanBatchId)
})

const showBindBlocked = computed(() => {
  const page = props.inspector?.page
  if (!page || page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING || page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return false
  }
  return !page.paperInstanceId
})

const canSubmitBind = computed(() =>
  Boolean(showBindForm.value && confirmedCandidateRosterId.value && !binding.value),
)

function registerStatusLabel(status: ScanBatchWorkbenchRegisterStatusCode): string {
  return ScanBatchWorkbenchRegisterStatusDescription[status]
}

function syncBindFormFromPage(): void {
  const page = props.inspector?.page
  if (!page) {
    recognizedStudentNo.value = ''
    confirmedCandidateRosterId.value = undefined
    attemptStatus.value = AttemptStatusCode.NORMAL
    attemptNo.value = ''
    resetCandidateSearch()
    return
  }
  recognizedStudentNo.value = page.ocrStudentNo?.trim() || ''
  confirmedCandidateRosterId.value = undefined
  attemptStatus.value = AttemptStatusCode.NORMAL
  attemptNo.value = ''
  if (showBindForm.value) {
    void searchCandidates(recognizedStudentNo.value || page.ocrStudentName || undefined)
  } else {
    resetCandidateSearch()
  }
}

async function submitBind(): Promise<void> {
  const page = props.inspector?.page
  if (!page?.paperInstanceId || !props.examId || !props.scanBatchId) {
    return
  }
  const rosterId = confirmedCandidateRosterId.value
  const blockReason = resolveCandidateBindingBlockReason(rosterId)
  if (blockReason) {
    message.error(blockReason)
    return
  }
  const validAttemptStatus = attemptStatus.value
  binding.value = true
  try {
    await bindPaper({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      paperInstanceId: page.paperInstanceId,
      pageId: page.pageId,
      recognizedStudentNo: recognizedStudentNo.value.trim() || undefined,
      confirmedCandidateRosterId: rosterId!,
      attemptStatus: validAttemptStatus,
      attemptNo: attemptNo.value.trim() || undefined,
    })
    message.success('试卷身份绑定成功')
    emit('bound')
  } catch (error) {
    showUserError(error, '试卷身份绑定失败')
  } finally {
    binding.value = false
  }
}

watch(
  () => props.inspector?.page.pageKey,
  () => {
    syncBindFormFromPage()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.scan-batch-page-inspector__hint,
.scan-batch-page-inspector__exception {
  margin-bottom: 12px;
}

.scan-batch-page-inspector__meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  margin: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  dt {
    margin: 0;
    color: var(--ant-color-text-tertiary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    font-size: 14px;
  }
}

.scan-batch-page-inspector__full-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.scan-batch-page-inspector__section {
  margin-top: 16px;
}

.scan-batch-page-inspector__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.scan-batch-page-inspector__bind-tip {
  margin: 0 0 12px;
  color: var(--ant-color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.scan-batch-page-inspector__bind-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}
</style>
