<template>
  <UiSpin :spinning="loading" aria-live="polite" :aria-busy="loading || undefined">
    <UiAlertStrip
      v-if="!loading && !inspector"
      tone="info"
      size="sm"
      dense
      inline
      :show-icon="false"
    >
      <template #default>
        <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
          <UiTag tone="blue" size="sm">未选页</UiTag>
          <span>请在左侧页轨选择一条扫描页后查看登记与绑定详情</span>
        </span>
      </template>
    </UiAlertStrip>
    <template v-else-if="inspector">
      <div class="scan-batch-page-inspector__summary">
        <div class="scan-batch-page-inspector__position">
          <span class="scan-batch-page-inspector__order">#{{ inspector.page.fileOrder }}</span>
          <span v-if="pagePositionLabel" class="scan-batch-page-inspector__position-text">
            {{ pagePositionLabel }}
          </span>
          <UiTooltip
            v-if="inspector.page.fileName"
            :title="inspector.page.fileName"
            placement="topLeft"
            popup-mount="body"
          >
            <PaperClipOutlined class="scan-batch-page-inspector__tip" />
          </UiTooltip>
        </div>
        <div class="scan-batch-page-inspector__tags">
          <UiTooltip
            v-if="inspector.inspectorHint"
            :title="inspector.inspectorHint"
            placement="topLeft"
          >
            <UiTag tone="blue" size="sm">
              {{ registerStatusLabel(inspector.page.registerStatus) }}
            </UiTag>
          </UiTooltip>
          <UiTag v-else tone="blue" size="sm">
            {{ registerStatusLabel(inspector.page.registerStatus) }}
          </UiTag>
          <UiTag
            v-if="inspector.page.qualityStatus"
            :tone="
              strictEnumTone(QUALITY_DECISION_TONE, inspector.page.qualityStatus, '扫描页质量判定')
            "
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
          <UiTooltip
            v-if="primaryDiagnostic"
            :title="primaryDiagnostic"
            placement="topLeft"
            popup-mount="body"
          >
            <UiTag tone="red" size="sm">异常</UiTag>
          </UiTooltip>
          <UiTooltip
            v-if="inspector.page.rosterMatchStatus && rosterMatchDiagnostic"
            :title="rosterMatchDiagnostic"
            placement="topLeft"
            popup-mount="body"
          >
            <UiTag
              :tone="
                strictEnumTone(
                  ScanBatchWorkbenchRosterMatchStatusTone,
                  inspector.page.rosterMatchStatus,
                  '页轨名册匹配态',
                )
              "
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
          </UiTooltip>
          <UiTag
            v-else-if="inspector.page.rosterMatchStatus"
            :tone="
              strictEnumTone(
                ScanBatchWorkbenchRosterMatchStatusTone,
                inspector.page.rosterMatchStatus,
                '页轨名册匹配态',
              )
            "
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
          <UiTag
            v-if="inspector.page.recognitionTaskStatus"
            :tone="
              strictEnumTone(TASK_STATUS_TONE, inspector.page.recognitionTaskStatus, '识别任务状态')
            "
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
          <UiTag v-if="bindingStatusLabel" tone="gray" size="sm">
            {{ bindingStatusLabel }}
          </UiTag>
        </div>
        <p v-if="ocrIdentityLine" class="scan-batch-page-inspector__subline">
          {{ ocrIdentityLine }}
        </p>
        <p v-else-if="boundIdentityLine" class="scan-batch-page-inspector__subline">
          {{ boundIdentityLine }}
        </p>
      </div>

      <section v-if="showBindForm" class="scan-batch-page-inspector__section">
        <h3 class="scan-batch-page-inspector__section-title">
          确认身份绑定
          <UiTooltip
            title="优先从本场名册选择考生；未命中时可核对 OCR 学号、姓名并选择租户正式班级，创建或补入名册后立即绑定。"
            placement="topLeft"
          >
            <InfoCircleOutlined class="scan-batch-page-inspector__tip" />
          </UiTooltip>
        </h3>
        <UiForm layout="vertical" class="scan-batch-page-inspector__bind-form">
          <UiFormItem v-if="inspector.page.ocrStudentName" label="识别姓名">
            <UiInput size="sm" :value="inspector.page.ocrStudentName" disabled />
          </UiFormItem>
          <UiFormItem v-if="inspector.page.ocrClassName" label="识别班级">
            <UiInput size="sm" :value="inspector.page.ocrClassName" disabled />
          </UiFormItem>
          <UiFormItem :label="recognizedStudentNoLabel">
            <UiInput
              size="sm"
              v-model="recognizedStudentNo"
              placeholder="文字识别学号或人工修正值"
              :maxlength="64"
            />
          </UiFormItem>
          <UiFormItem v-if="!creatingCandidate" label="确认考生" required>
            <UiSelect
              size="sm"
              v-model="confirmedCandidateRosterId"
              :placeholder="candidateSearchPlaceholder"
              allow-search
              :options="candidateOptions"
              :filter-option="false"
              :loading="candidatesLoading"
              allow-clear
              @search="searchCandidates"
            />
          </UiFormItem>
          <template v-else>
            <UiFormItem label="学生姓名" required>
              <UiInput
                size="sm"
                v-model="confirmedStudentName"
                placeholder="核对并确认学生姓名"
                :maxlength="64"
              />
            </UiFormItem>
            <UiFormItem label="所属院系" required>
              <UiSelect
                size="sm"
                v-model="confirmedDepartmentId"
                :options="departmentOptions"
                :loading="departmentsLoading"
                placeholder="选择学生所属院系"
                allow-search
                option-filter-prop="label"
              />
            </UiFormItem>
            <UiFormItem label="正式班级" required>
              <UiSelect
                size="sm"
                v-model="confirmedClassId"
                :options="classOptions"
                :loading="classesLoading"
                :disabled="!confirmedDepartmentId"
                placeholder="选择租户已有正式班级"
                allow-search
                option-filter-prop="label"
              />
            </UiFormItem>
          </template>
          <UiFormItem label="答卷状态" required>
            <UiSelect
              size="sm"
              v-model="attemptStatus"
              :options="BINDABLE_ATTEMPT_STATUS_OPTIONS"
            />
          </UiFormItem>
          <UiFormItem label="答卷编号（可选）">
            <UiInput
              size="sm"
              v-model="attemptNo"
              placeholder="同一考生多卷时区分"
              :maxlength="32"
            />
          </UiFormItem>
          <UiButton
            v-if="!creatingCandidate"
            variant="primary"
            size="sm"
            block
            :loading="binding"
            :disabled="canSubmitBind !== true"
            @click="submitBind"
          >
            确认绑定
          </UiButton>
          <UiButton
            v-else
            variant="primary"
            size="sm"
            block
            :loading="binding"
            :disabled="canSubmitCreateBind !== true"
            @click="submitCreateAndBind"
          >
            创建考生并绑定
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            block
            :disabled="binding"
            @click="toggleCandidateCreation"
          >
            <UserAddOutlined v-if="!creatingCandidate" />
            {{ creatingCandidate ? '返回选择已有考生' : '名单中没有？创建并绑定' }}
          </UiButton>
        </UiForm>
      </section>
      <div v-else-if="showBindBlocked === true" class="scan-batch-page-inspector__blocked">
        <UiTag tone="orange" size="sm">无法绑定</UiTag>
        <UiTooltip :title="bindBlockedHint" placement="topLeft">
          <InfoCircleOutlined class="scan-batch-page-inspector__tip" />
        </UiTooltip>
      </div>

      <section v-if="showReassignSection" class="scan-batch-page-inspector__section">
        <h3 class="scan-batch-page-inspector__section-title">
          人工调卷
          <UiTooltip
            title="用于处理同批次误归卷、混扫串卷或未归卷页。若目标卷同模板页已占用，后端会自动互换同模板页。"
            placement="topLeft"
          >
            <InfoCircleOutlined class="scan-batch-page-inspector__tip" />
          </UiTooltip>
        </h3>
        <UiForm layout="vertical" class="scan-batch-page-inspector__bind-form">
          <UiFormItem label="当前归属">
            <UiInput size="sm" :value="currentPaperLabel" disabled />
          </UiFormItem>
          <UiFormItem label="目标试卷" required>
            <UiSelect
              size="sm"
              v-model="targetPaperInstanceId"
              :options="reassignTargetOptions"
              :disabled="reassignTargetOptions.length === 0"
              placeholder="选择当前页应归属的试卷"
              allow-search
              option-filter-prop="label"
            />
          </UiFormItem>
          <UiButton
            variant="primary"
            size="sm"
            block
            :loading="reassigning === true"
            :disabled="canSubmitReassign !== true"
            @click="submitReassign"
          >
            调整到目标试卷
          </UiButton>
        </UiForm>
      </section>
    </template>
  </UiSpin>
</template>

<script lang="ts" setup>
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
import type {
  ExamScannerBatchAttributionItemVO,
  ExamScannerBatchPageInspectorVO,
} from '@/apis/mark/exam-scan'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import PaperClipOutlined from '@ant-design/icons-vue/PaperClipOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'

import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { getClassesByDepartment } from '@/apis/edu/class'
import { getExamDetail } from '@/apis/mark/exam'
import { bindPaper, createCandidateAndBindPaper } from '@/apis/mark/exam-binding'
import {
  QUALITY_DECISION_TONE,
  QualityDecisionDescription,
  reassignScannerBatchPage,
  ScanBatchWorkbenchRegisterStatusDescription,
  ScanBatchWorkbenchRosterMatchStatusDescription,
  ScanBatchWorkbenchRosterMatchStatusTone,
} from '@/apis/mark/exam-scan'
import { TASK_STATUS_TONE, TaskStatusDescription } from '@/apis/mark/task-status'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import {
  BINDABLE_ATTEMPT_STATUS_OPTIONS,
  useExamPaperBindCandidates,
} from '@/composables/useExamPaperBindCandidates'
import { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import { ScanBatchWorkbenchBindingStatusCode } from '@/types/enums/scan-batch-workbench-binding-status-enum'
import { ScanBatchWorkbenchRegisterStatusCode } from '@/types/enums/scan-batch-workbench-register-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ScanBatchPageInspectorPanel' })

const props = withDefaults(
  defineProps<{
  inspector: ExamScannerBatchPageInspectorVO | null
  loading?: boolean
  examId?: string
  scanBatchId?: string
  attributionItems?: ExamScannerBatchAttributionItemVO[]
  preferredTargetPaperInstanceId?: string
  /** MVR-262：主考写权限；false 时隐藏绑定/归卷写区 */
  canManageOwnerWrites?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(),
  {
  canManageOwnerWrites: false,
  },
)

const emit = defineEmits<{
  bound: []
  reassigned: []
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
const creatingCandidate = ref(false)
const confirmedStudentName = ref('')
const confirmedDepartmentId = ref<string | undefined>()
const confirmedClassId = ref<string | undefined>()
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const classOptions = ref<Array<{ value: string, label: string }>>([])
const departmentsLoading = ref(false)
const classesLoading = ref(false)
const targetPaperInstanceId = ref<string | undefined>(undefined)
const reassigning = ref(false)

const recognizedStudentNoLabel = computed(() => {
  const page = props.inspector?.page
  if (page?.ocrStudentNo) {
    return '识别学号（审计留痕，可修正）'
  }
  return '识别学号（可选，审计留痕）'
})

const candidateSearchPlaceholder = computed(() => {
  const page = props.inspector?.page
  if (page?.ocrStudentName && page?.ocrClassName) {
    return '按姓名、班级或学号搜索名册'
  }
  if (page?.ocrStudentName) {
    return '按姓名或学号搜索名册'
  }
  return '按姓名或学号搜索名册'
})

function buildOcrSearchKeyword(
  page: NonNullable<typeof props.inspector>['page'],
): string | undefined {
  const parts: string[] = []
  if (page.ocrStudentNo?.trim()) {
    parts.push(page.ocrStudentNo.trim())
  }
  if (page.ocrStudentName?.trim()) {
    parts.push(page.ocrStudentName.trim())
  }
  if (page.ocrClassName?.trim()) {
    parts.push(page.ocrClassName.trim())
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

const pagePositionLabel = computed(() => {
  const page = props.inspector?.page
  if (!page) {
    return ''
  }
  const parts: string[] = []
  if (page.pageSeq !== undefined) {
    parts.push(`页 ${page.pageSeq}`)
  }
  if (page.templatePageNo !== undefined) {
    parts.push(`模板 ${page.templatePageNo}`)
  }
  return parts.join(' · ')
})

const primaryDiagnostic = computed(() => {
  const summary = props.inspector?.exceptionSummary?.trim()
  if (summary) {
    return summary
  }
  return props.inspector?.page.diagnostic?.trim() || ''
})

const rosterMatchDiagnostic = computed(() => {
  const diagnostic = props.inspector?.page.rosterMatchDiagnostic?.trim()
  if (!diagnostic || diagnostic === primaryDiagnostic.value) {
    return ''
  }
  return diagnostic
})

const bindingStatusLabel = computed(() => {
  const page = props.inspector?.page
  if (!page) {
    return ''
  }
  if (page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return '已绑定'
  }
  if (
    page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.REGISTERED
    && (page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.UNBOUND
      || page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.CONFLICT)
  ) {
    return '待绑定'
  }
  return ''
})

const ocrIdentityLine = computed(() => {
  const page = props.inspector?.page
  if (!page || page.bindingStatus === ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return ''
  }
  const parts: string[] = []
  if (page.ocrStudentNo) {
    parts.push(`学号 ${page.ocrStudentNo}`)
  }
  if (page.ocrStudentName) {
    parts.push(`姓名 ${page.ocrStudentName}`)
  }
  if (page.ocrClassName) {
    parts.push(`班级 ${page.ocrClassName}`)
  }
  return parts.join(' · ')
})

const boundIdentityLine = computed(() => {
  const page = props.inspector?.page
  if (!page || page.bindingStatus !== ScanBatchWorkbenchBindingStatusCode.BOUND) {
    return ''
  }
  const parts: string[] = []
  if (page.candidateName) {
    parts.push(page.candidateName)
  }
  if (page.studentNo) {
    parts.push(page.studentNo)
  }
  if (page.className) {
    parts.push(page.className)
  }
  return parts.join(' · ')
})

const showBindForm = computed(() => {
  // MVR-376/967：须主考写权限（仅认 props.canManageOwnerWrites===true）
  const page = props.inspector?.page
  return Boolean(
    props.canManageOwnerWrites === true && page
    && page.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING
    && page.bindingStatus !== ScanBatchWorkbenchBindingStatusCode.BOUND
    && page.paperInstanceId
    && props.examId
    && props.scanBatchId,
  )
})

const showBindBlocked = computed(() => {
  const page = props.inspector?.page
  return Boolean(
    page
    && page.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING
    && page.bindingStatus !== ScanBatchWorkbenchBindingStatusCode.BOUND
    && !page.paperInstanceId,
  )
})

const bindBlockedHint = computed(() => {
  if (showReassignSection.value) {
    return '当前页已登记但尚未归卷，请先在下方选择目标试卷执行人工调卷。'
  }
  return '当前页已登记但未关联试卷实例，请重试页登记或联系管理员处理。'
})

const reassignTargetOptions = computed(() => {
  const currentPaperInstanceId = props.inspector?.page.paperInstanceId
  return (props.attributionItems ?? [])
    .filter(
      (item) =>
        !item.unassignedBucket
        && item.paperInstanceId
        && item.paperInstanceId !== currentPaperInstanceId,
    )
    .map((item) => {
      const identityParts = [
        item.studentName || item.recognizedStudentName || '待确认学生',
        item.studentNo || item.recognizedStudentNo || '无学号',
        item.className || item.recognizedClassName || '未识别班级',
      ]
      const pagePart = item.pages
        .map((page) => page.templatePageNo ?? page.pageSeq ?? page.fileOrder)
        .join('/')
      return {
        value: item.paperInstanceId!,
        label: `${identityParts.join(' · ')} · 页位 ${pagePart}`,
      }
    })
})

const currentPaperLabel = computed(() => {
  const page = props.inspector?.page
  if (!page) {
    return '—'
  }
  if (!page.paperInstanceId) {
    return '未归卷'
  }
  const currentItem = (props.attributionItems ?? []).find(
    (item) => item.paperInstanceId === page.paperInstanceId,
  )
  if (!currentItem) {
    return `试卷实例 ${page.paperInstanceId}`
  }
  return [
    currentItem.studentName || currentItem.recognizedStudentName || '待确认学生',
    currentItem.studentNo || currentItem.recognizedStudentNo || '无学号',
    currentItem.className || currentItem.recognizedClassName || '未识别班级',
  ].join(' · ')
})

const showReassignSection = computed(() => {
  const page = props.inspector?.page
  // MVR-376/967：须主考写权限（仅认 props.canManageOwnerWrites===true）
  return Boolean(
    props.canManageOwnerWrites === true && page
    && props.examId
    && props.scanBatchId
    && page.pageId
    && page.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING
    && page.templatePageNo !== undefined
    && reassignTargetOptions.value.length > 0,
  )
})

const canSubmitReassign = computed(() =>
  Boolean(showReassignSection.value && targetPaperInstanceId.value && reassigning.value !== true),
)

const canSubmitBind = computed(() =>
  Boolean(showBindForm.value && confirmedCandidateRosterId.value && !binding.value),
)

const canSubmitCreateBind = computed(() =>
  Boolean(
    showBindForm.value
    && recognizedStudentNo.value.trim()
    && confirmedStudentName.value.trim()
    && confirmedClassId.value
    && !binding.value,
  ),
)

function registerStatusLabel(status: ScanBatchWorkbenchRegisterStatusCode): string {
  return strictEnumLabel(ScanBatchWorkbenchRegisterStatusDescription, status, '扫描页登记状态')
}

function syncBindFormFromPage(): void {
  const page = props.inspector?.page
  if (!page) {
    recognizedStudentNo.value = ''
    confirmedCandidateRosterId.value = undefined
    attemptStatus.value = AttemptStatusCode.NORMAL
    attemptNo.value = ''
    targetPaperInstanceId.value = undefined
    resetCandidateSearch()
    return
  }
  recognizedStudentNo.value = page.ocrStudentNo?.trim() || ''
  confirmedStudentName.value = page.ocrStudentName?.trim() || ''
  confirmedCandidateRosterId.value = undefined
  creatingCandidate.value = false
  confirmedDepartmentId.value = undefined
  confirmedClassId.value = undefined
  attemptStatus.value = AttemptStatusCode.NORMAL
  attemptNo.value = ''
  targetPaperInstanceId.value = reassignTargetOptions.value[0]?.value
  if (showBindForm.value) {
    void searchCandidates(buildOcrSearchKeyword(page))
  } else {
    resetCandidateSearch()
  }
}

async function loadCandidateCreationScope(): Promise<void> {
  if (!props.examId) return
  departmentsLoading.value = true
  try {
    const [departments, exam] = await Promise.all([
      departmentCatalogApi.list(),
      getExamDetail(props.examId),
    ])
    departmentOptions.value = departments.map(item => ({ value: item.id, label: item.deptName }))
    confirmedDepartmentId.value = exam.referenceDepartmentId
      ?? (departments.length === 1 ? departments[0]?.id : undefined)
  } catch (error) {
    departmentOptions.value = []
    showUserError(error, '院系与班级范围加载失败')
  } finally {
    departmentsLoading.value = false
  }
}

async function loadFormalClasses(): Promise<void> {
  confirmedClassId.value = undefined
  classOptions.value = []
  if (!confirmedDepartmentId.value) return
  classesLoading.value = true
  try {
    const classes = await getClassesByDepartment({ departmentId: confirmedDepartmentId.value })
    classOptions.value = classes
      .filter(item => item.id && item.className)
      .map(item => ({ value: item.id!, label: item.className! }))
  } catch (error) {
    showUserError(error, '正式班级加载失败')
  } finally {
    classesLoading.value = false
  }
}

function toggleCandidateCreation(): void {
  creatingCandidate.value = !creatingCandidate.value
  if (creatingCandidate.value && departmentOptions.value.length === 0) {
    void loadCandidateCreationScope()
  }
}

async function submitBind(): Promise<void> {
  // MVR-376/929：与 canManageOwnerWrites ∧ canSubmitBind / 按钮 disabled 同源二次闸
  if (props.canManageOwnerWrites !== true) {
    showFormValidationMessage('当前账号无主考扫描写权限，无法绑定身份')
    return
  }
  if (canSubmitBind.value !== true) {
    showFormValidationMessage('当前页不可绑定身份（状态不满足或未选择确认考生）')
    return
  }
  const page = props.inspector?.page
  if (!page?.paperInstanceId || !props.examId || !props.scanBatchId) {
    return
  }
  if (binding.value === true) {
    return
  }
  const rosterId = confirmedCandidateRosterId.value
  const blockReason = resolveCandidateBindingBlockReason(rosterId)
  if (blockReason) {
    void message.error(blockReason)
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
    void message.success('试卷身份绑定成功')
    emit('bound')
  } catch (error) {
    showUserError(error, '试卷身份绑定失败')
  } finally {
    binding.value = false
  }
}

async function submitCreateAndBind(): Promise<void> {
  if (props.canManageOwnerWrites !== true || canSubmitCreateBind.value !== true) {
    showFormValidationMessage('请完整确认学号、姓名和正式班级')
    return
  }
  const page = props.inspector?.page
  if (!page?.paperInstanceId || !page.pageId || !props.examId || !props.scanBatchId) return
  binding.value = true
  try {
    const result = await createCandidateAndBindPaper({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      paperInstanceId: page.paperInstanceId,
      pageId: page.pageId,
      studentNo: recognizedStudentNo.value.trim(),
      studentName: confirmedStudentName.value.trim(),
      classId: confirmedClassId.value!,
      attemptStatus: attemptStatus.value,
      attemptNo: attemptNo.value.trim() || undefined,
    })
    void message.success(result.createdStudentUser ? '考生账号已创建并完成答卷绑定' : '考生已加入名册并完成答卷绑定')
    emit('bound')
  } catch (error) {
    showUserError(error, '创建考生并绑定失败')
  } finally {
    binding.value = false
  }
}

async function submitReassign(): Promise<void> {
  // MVR-376/929：与 canManageOwnerWrites ∧ canSubmitReassign / 按钮 disabled 同源二次闸
  if (props.canManageOwnerWrites !== true) {
    showFormValidationMessage('当前账号无主考扫描写权限，无法人工调卷')
    return
  }
  if (canSubmitReassign.value !== true) {
    showFormValidationMessage('当前页不可人工调卷（状态不满足或未选择目标试卷）')
    return
  }
  const page = props.inspector?.page
  if (!page?.pageId || !props.examId || !props.scanBatchId || !targetPaperInstanceId.value) {
    return
  }
  if (reassigning.value === true) {
    return
  }
  reassigning.value = true
  try {
    const response = await reassignScannerBatchPage({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      pageId: page.pageId,
      targetPaperInstanceId: targetPaperInstanceId.value,
    })
    void message.success(response.diagnostic || '扫描页归卷已调整')
    emit('reassigned')
  } catch (error) {
    showUserError(error, '人工调卷失败')
  } finally {
    reassigning.value = false
  }
}

watch(
  () => props.inspector?.page.pageKey,
  () => {
    syncBindFormFromPage()
  },
  { immediate: true },
)

watch(
  () => props.preferredTargetPaperInstanceId,
  (value) => {
    if (!value) {
      return
    }
    if (reassignTargetOptions.value.some((option) => option.value === value)) {
      targetPaperInstanceId.value = value
    }
  },
  { immediate: true },
)

watch(confirmedDepartmentId, () => {
  if (creatingCandidate.value) void loadFormalClasses()
})
</script>

<style lang="scss" scoped>
.scan-batch-page-inspector__summary {
  margin-bottom: var(--dp-space-component);
}

.scan-batch-page-inspector__position {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  margin-bottom: var(--dp-space-component-tight);
}

.scan-batch-page-inspector__order {
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}

.scan-batch-page-inspector__position-text {
  min-width: 0;
  overflow: hidden;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-page-inspector__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-xs);
}

.scan-batch-page-inspector__subline {
  margin: var(--dp-space-component-tight) 0 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
}

.scan-batch-page-inspector__tip {
  flex-shrink: 0;
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-sm);
  cursor: help;
}

.scan-batch-page-inspector__section {
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border-subtle);
}

.scan-batch-page-inspector__section-title {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
}

.scan-batch-page-inspector__blocked {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border-subtle);
}

.scan-batch-page-inspector__bind-form {
  :deep(.ant-form-item) {
    margin-bottom: var(--dp-space-component);
  }
}
</style>
