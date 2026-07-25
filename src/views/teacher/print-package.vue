<template>
  <StageWorkbenchShell class="print-package-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" show-title title="印刷包">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template #actions>
          <UiTooltip
            v-if="printPackageApplicable && canManageOwnerPrintPackageWrites"
            :title="paperGovernanceEditHint"
          >
            <UiButton size="sm" variant="outline" :disabled="!paperGovernanceEditable" @click="paperGovernanceDrawerOpen = true">
              维护命题资料
            </UiButton>
          </UiTooltip>
          <UiTooltip
            v-if="printPackageApplicable && canManageOwnerPrintPackageWrites"
            :title="paperGovernanceActionHint"
          >
            <UiButton
              size="sm"
              variant="outline"
              :loading="checkingGovernance"
              :disabled="!selectedExamId"
              @click="handleCheckGovernance"
            >
              命题规则核验
            </UiButton>
          </UiTooltip>
          <UiTooltip v-if="printPackageApplicable && canManageOwnerPrintPackageWrites" :title="submitApprovalHint">
            <UiButton
              size="sm"
              variant="outline"
              :loading="submittingApproval"
              :disabled="submitApprovalBlocked"
              @click="handleSubmitApproval"
            >
              提交指定教师审核
            </UiButton>
          </UiTooltip>
          <UiButton
            v-if="printPackageApplicable && canApproveCurrentReviewer"
            size="sm"
            variant="primary"
            @click="openApprovalModal"
          >
            处理当前审核
          </UiButton>
          <a-dropdown v-if="printPackageApplicable && paperGovernance?.paperSets.length" placement="bottomRight">
            <UiButton size="sm" variant="outline">下载受控试卷</UiButton>
            <template #overlay>
              <a-menu @click="handleSourcePaperDownload">
                <a-menu-item v-for="paperSet in paperGovernance?.paperSets" :key="paperSet.paperCode">
                  下载 {{ paperSet.paperCode }} 卷原件
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <UiTooltip
            v-if="printPackageApplicable && canManageOwnerPrintPackageWrites"
            :title="generateDisabledReason"
          >
            <UiButton
              variant="primary"
              size="sm"
              :loading="generating"
              :disabled="generateBlocked"
              @click="openGenerateModal"
            >
              生成印刷包
            </UiButton>
          </UiTooltip>
        </template>
      </ContextBar>
    </template>

    <WorkflowReadinessPanel
      v-if="selectedExamId && printPackageApplicable && printPackagePrepWorkflowSteps.length"
      title="完成以下准备步骤后可生成印刷包"
      :steps="printPackagePrepWorkflowSteps"
    />

    <UiAlertStrip
      v-if="selectedExamId && printPackageApplicable && paperGovernanceAlert"
      :tone="paperGovernanceAlert.tone"
      :title="paperGovernanceAlert.title"
      :description="paperGovernanceAlert.description"
      :closable="false"
    />

    <template v-if="selectedExamId && printPackageApplicable" #signal>
      <SignalBand compact variant="panel" :metrics="packageSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="print-package-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiSkeletonState
        v-if="examDetailLoading && !examDetail"
        variant="card"
        compact
        class="print-package-page__empty"
      />

      <UiAlertStrip
        v-else-if="examDetailError"
        tone="error"
        title="考试详情加载失败"
        :closable="false"
        class="print-package-page__blocking-strip"
      />

      <UiEmpty
        size="sm"
        v-else-if="!printPackageApplicable"
        :description="printPackageSkipHint"
        class="print-package-page__empty"
      >
        <UiButton size="sm" variant="primary" @click="goPrepWorkbench"> 返回准备工作台 </UiButton>
      </UiEmpty>

      <template v-else>
        <WorkbenchSurfaceCard
          v-if="examDetail?.prepScenarioGuide"
          flush
          class="print-package-page__scenario"
        >
          <ExamPrepScenarioPanel :guide="examDetail.prepScenarioGuide" />
        </WorkbenchSurfaceCard>

        <UiAlertStrip
          v-if="listLoadFailed || panelLoadFailed"
          tone="error"
          title="印刷包数据加载失败"
          :closable="false"
          class="print-package-page__blocking-strip"
        />

        <WorkbenchSurfaceCard flush>
          <template #toolbar>
            <span class="print-package-page__flow-hint">{{ printPackageFlowHint }}</span>
          </template>
          <UiDataTable
            v-model:current="pagination.pageNum"
            v-model:page-size="pagination.pageSize"
            pagination-mode="server"
            :columns="packageColumns"
            :data-source="packageList"
            :loading="loading"
            :load-error="listLoadFailed"
            :total="pagination.total"
            row-key="printPackageId"
            size="middle"
            flat
            @page-change="handlePackagePageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'packageName'">
                {{ record.packageName }}
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="statusTone(record.status)" size="sm">
                  {{ statusLabel(record.status) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'sealRemark'">
                {{ record.sealRemark || '未填写封装备注' }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildPackageActions(record)"
                  split
                  @action="(key) => handlePackageAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>

        <!-- 生成印刷包 -->
        <UiDrawer
          v-model:open="generateModalVisible"
          title="生成印刷包"
          :width="560"
          :hide-footer="false"
          ok-text="生成并写入印刷包"
          cancel-text="取消"
          :confirm-loading="generating"
          @ok="handleGenerate"
        >
          <UiAlertStrip
            tone="info"
            title="本次生成影响"
            :closable="false"
            class="print-package-page__generate-impact"
          >
            <ul class="print-package-page__generate-impact-list">
              <li>将基于当前制卷设计生成空白印刷母版，供考场按座位印制</li>
              <li>考生领卷后自行填写学号姓名；不读取、不依赖考生名册</li>
              <li>制卷形态：{{ generateImpactLayoutLabel }}；印刷来源：{{ generateImpactPrintSourceLabel }}</li>
              <li>将新增印刷包（编号 {{ generateForm.packageNo.trim() || '待填写' }}），不会覆盖已有包</li>
              <li v-if="generateImpactConfidential">涉密考试：生成文件将附加保密水印，预览与下载受控</li>
            </ul>
          </UiAlertStrip>
          <UiForm layout="vertical" style="margin-top: var(--dp-space-component-tight)">
            <UiFormItem label="印刷包编号" required>
              <UiInput
                size="sm"
                v-model="generateForm.packageNo"
                placeholder="例如：PKG-2026-001"
                :maxlength="50"
              />
            </UiFormItem>
            <UiFormItem label="印刷包名称" required>
              <UiInput
                size="sm"
                v-model="generateForm.packageName"
                placeholder="例如：期末A卷-第一批次"
                :maxlength="100"
              />
            </UiFormItem>
            <UiFormItem label="封装备注">
              <UiTextarea
                size="sm"
                v-model="generateForm.sealRemark"
                :rows="2"
                :maxlength="500"
                placeholder="可选"
              />
            </UiFormItem>
          </UiForm>
        </UiDrawer>

        <!-- 印刷包明细 -->
        <UiDrawer
          v-model:open="detailModalVisible"
          :title="`印刷包明细 - ${detailPackage?.packageName ?? ''}`"
          :width="960"
          hide-footer
        >
          <UiSkeletonState
            v-if="detailLoading && detailItems.length === 0"
            variant="table"
            compact
          />
          <UiDataTable
            v-else
            v-model:current="detailPagination.pageNum"
            v-model:page-size="detailPagination.pageSize"
            pagination-mode="server"
            :columns="detailColumns"
            :data-source="detailItems"
            :loading="detailLoading"
            :total="detailPagination.total"
            :sticky-header="false"
            flat
            row-key="printPackageItemId"
            size="small"
            bordered
            :scroll="{ y: 400 }"
            @page-change="handleDetailPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <UiTag :tone="detailItemStatusTone(record.status)" size="sm">
                  {{ detailItemStatusLabel(record.status) }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </UiDrawer>

        <LayoutPreviewDrawer
          v-model:open="previewModalOpen"
          title="印刷包预览"
          :preview-pdf-file-id="previewPackageFileId"
        />

        <ExamPaperGovernanceDrawer
          v-if="selectedExamId"
          v-model:open="paperGovernanceDrawerOpen"
          :exam-id="selectedExamId"
          :reference-department-id="examDetail?.referenceDepartmentId"
          :department-name="examDetail?.departmentName"
          :governance="paperGovernance"
          :saving="savingGovernance"
          @save="handleSaveGovernance"
        />
        <a-modal v-model:open="approvalModalOpen" title="命题资料审核" :confirm-loading="approvingGovernance" @ok="handleApproval">
          <UiForm layout="vertical">
            <UiFormItem label="当前审核"><UiInput model-value="您是本节点被指定的审核教师" disabled /></UiFormItem>
            <UiFormItem label="签审结论" required>
              <a-select v-model:value="approvalForm.approvalAction" :options="approvalActionOptions" />
            </UiFormItem>
            <UiFormItem label="签审意见" required>
              <UiTextarea v-model="approvalForm.comment" :rows="4" :maxlength="2000" show-count placeholder="说明通过依据或明确整改项" />
            </UiFormItem>
          </UiForm>
        </a-modal>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamWorkbenchPrintPackagePanelResponse } from '@/apis/mark/exam-progress'
import type { ExamPaperGovernanceResponse } from '@/apis/mark/paper-governance'
import type { ExamPrintPackageResponse, PrintPackageItemVO } from '@/apis/mark/print-package'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { PrintPackageItemStatusCode } from '@/types/enums/print-package-item-status-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ExamMaterialLayoutModeCode,
  ExamMaterialLayoutModeDescription,
  ExamPrintSourceModeCode,
  ExamPrintSourceModeDescription,
  getExamDetail,
} from '@/apis/mark/exam'
import { getPrintPackagePanel } from '@/apis/mark/exam-progress'
import {
  approveExamPaperGovernance,
  checkExamPaperGovernance,
  downloadExamPaperSource,
  ExamPaperApprovalActionCode,
  ExamPaperGovernanceStatusCode,
  getExamPaperGovernance,
  saveExamPaperGovernance,
  submitExamPaperGovernanceApproval,
} from '@/apis/mark/paper-governance'
import {
  generatePrintPackage,
  isLayoutNotReadyError,
  pagePrintPackageItems,
  pagePrintPackages,
  PRINT_PACKAGE_EXTERNAL_PRINT_HINT,
  PRINT_PACKAGE_FLOW_HINT,
  PRINT_PACKAGE_ITEM_STATUS_TONE,
  PRINT_PACKAGE_STATUS_TONE,
  PrintPackageItemStatusDescription,
  PrintPackageStatusDescription,
} from '@/apis/mark/print-package'
import ExamPaperGovernanceDrawer from '@/components/mark/ExamPaperGovernanceDrawer.vue'
import LayoutPreviewDrawer from '@/components/mark/layout-designer/LayoutPreviewDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamPrepScenarioPanel from '@/components/workbench/ExamPrepScenarioPanel.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import { isExamConfidentialFlag } from '@/composables/useConfidentialWatermark'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import { isPrintPackageMenuApplicable } from '@/utils/exam-print-package-applicable'
import { handleBlobDownload } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { resolvePrintPackageGenerateGate } from '@/utils/workflow-readiness/print-package-prep-readiness'

defineOptions({ name: 'TeacherPrintPackage' })

const router = useRouter()
const { selectedExamId, selectedExam } = useMarkExamContext()
const workbenchContext = useMarkWorkbenchContext()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('印刷包')
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = ref<Awaited<ReturnType<typeof getExamDetail>> | null>(null)
const examDetailLoading = ref(false)
const examDetailError = ref(false)
let examLoadGeneration = 0

const prepStepCards = computed(() => {
  const backendSteps = workbenchContext.snapshot.value?.prepSteps
  const detail = examDetail.value
  if (!backendSteps?.length || !detail) {
    return []
  }
  return buildPrepStepCards(backendSteps, detail)
})

const printPackageGenerateGate = computed(() => {
  if (!selectedExamId.value) {
    return {
      generateBlocked: false,
      panelSteps: [],
      disabledTooltip: undefined,
    }
  }
  return resolvePrintPackageGenerateGate({
    examId: selectedExamId.value,
    backendPrepSteps: workbenchContext.snapshot.value?.prepSteps,
    prepStepCards: prepStepCards.value.length > 0 ? prepStepCards.value : undefined,
  })
})

const governanceApprovedForPrint = computed(
  () => paperGovernance.value?.governance?.status === ExamPaperGovernanceStatusCode.APPROVED_FOR_PRINT,
)
const generateBlocked = computed(
  () =>
    printPackageGenerateGate.value.generateBlocked
    || !governanceApprovedForPrint.value
    || panelLoadFailed.value
    || listLoadFailed.value,
)
const printPackagePrepWorkflowSteps = computed(() => printPackageGenerateGate.value.panelSteps)
const generateDisabledReason = computed(() => {
  if (panelLoadFailed.value || listLoadFailed.value) {
    return '印刷包数据加载失败，请切换考试或离开后再进入'
  }
  if (!governanceApprovedForPrint.value) {
    return '须完成本场指定审核教师及学院政策要求的外审后，方可生成印刷包'
  }
  return printPackageGenerateGate.value.disabledTooltip
})

const printPackageApplicable = computed(() => {
  const detail = examDetail.value
  if (!detail?.materialLayoutMode) {
    return false
  }
  return isPrintPackageMenuApplicable(detail.materialLayoutMode, detail.printSourceMode)
})

const printPackageSkipHint = computed(() => {
  const detail = examDetail.value
  if (!detail?.materialLayoutMode) {
    return '请先在工作台保存制卷形态。'
  }
  if (detail.materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER
    && detail.printSourceMode === ExamPrintSourceModeCode.EXTERNAL_PRINT) {
    return PRINT_PACKAGE_EXTERNAL_PRINT_HINT
  }
  return ''
})

const printPackageFlowHint = computed(
  () => examDetail.value?.prepScenarioGuide?.printGuidance ?? PRINT_PACKAGE_FLOW_HINT,
)
const generateImpactLayoutLabel = computed(() => {
  const mode = examDetail.value?.materialLayoutMode
  return mode
    ? strictEnumLabel(ExamMaterialLayoutModeDescription, mode, '制卷形态')
    : '—'
})
const generateImpactPrintSourceLabel = computed(() => {
  const mode = examDetail.value?.printSourceMode
  return mode
    ? strictEnumLabel(ExamPrintSourceModeDescription, mode, '印刷来源')
    : '—'
})
const generateImpactConfidential = computed(
  () => isExamConfidentialFlag(examDetail.value?.confidential),
)

function goPrepWorkbench(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspacePrep',
    params: { examId: selectedExamId.value },
  })
}

// ─── 印刷包分页列表 ─────────────────────────────────────────────────

const loading = ref(false)
const listLoadFailed = ref(false)
const panelLoadFailed = ref(false)
const packageList = ref<ExamPrintPackageResponse[]>([])
const printPackagePanel = ref<ExamWorkbenchPrintPackagePanelResponse | null>(null)
const paperGovernance = ref<ExamPaperGovernanceResponse | null>(null)
const paperGovernanceDrawerOpen = ref(false)
const savingGovernance = ref(false)
const checkingGovernance = ref(false)
const submittingApproval = ref(false)
const approvingGovernance = ref(false)
const approvalModalOpen = ref(false)
const approvalForm = reactive<{ approvalAction: ExamPaperApprovalActionCode, comment: string }>({
  approvalAction: ExamPaperApprovalActionCode.APPROVED,
  comment: '',
})
const approvalActionOptions = [
  { value: ExamPaperApprovalActionCode.APPROVED, label: '通过' },
  { value: ExamPaperApprovalActionCode.REJECTED, label: '退回整改' },
]
/** MVR-266/324：仅认 BE canManageOwnerPrintPackageWrites===true；禁止缺省回退 isExamOwner */
const canManageOwnerPrintPackageWrites = computed(
  () => printPackagePanel.value?.canManageOwnerPrintPackageWrites === true,
)

const paperGovernanceAlert = computed(() => {
  const governance = paperGovernance.value?.governance
  if (!governance) {
    return {
      tone: 'warning' as const,
      title: '尚未维护命题计划与试卷组',
      description: '请先在制卷设计中维护当前考试的命题资料，再执行规则核验。',
    }
  }
  if (governance.status === ExamPaperGovernanceStatusCode.APPROVED_FOR_PRINT) {
    return {
      tone: 'success' as const,
      title: '命题资料已完成指定教师签审',
      description: `已于 ${governance.printReadyTime ?? '刚刚'} 批准，可生成系统印刷包。`,
    }
  }
  if (governance.status === ExamPaperGovernanceStatusCode.RECTIFICATION_REQUIRED) {
    const latestRejection = [...(paperGovernance.value?.approvalRecords ?? [])].reverse().find((item) => item.approvalAction === ExamPaperApprovalActionCode.REJECTED)
    return {
      tone: 'error' as const,
      title: '命题资料已退回整改',
      description: latestRejection?.comment || '请按签审意见修改资料后重新核验并提交。',
    }
  }
  const failed = paperGovernance.value?.ruleChecks.filter((item) => !item.passedFlag) ?? []
  return {
    tone: 'warning' as const,
    title: governance.status === ExamPaperGovernanceStatusCode.RULE_CHECKED ? '规则已通过，等待提交指定教师审核' : approvalPendingStatuses.has(governance.status) ? '命题资料正在指定教师审核' : '命题规则尚未通过',
    description: failed.length > 0 ? failed.map((item) => item.message).join('；') : '请按当前治理状态完成下一步。',
  }
})
const approvalPendingStatuses = new Set<ExamPaperGovernanceStatusCode>([
  ExamPaperGovernanceStatusCode.INTERNAL_REVIEW_PENDING,
  ExamPaperGovernanceStatusCode.EXTERNAL_REVIEW_PENDING,
])

const paperGovernanceActionHint = computed(() => {
  if (!paperGovernance.value?.governance) return '请先在制卷设计中维护命题计划与试卷组'
  return '按本校当前命题规则核验试卷组、题型与分值'
})
const paperGovernanceEditable = computed(() => {
  const status = paperGovernance.value?.governance?.status
  return !status || status === ExamPaperGovernanceStatusCode.DRAFT || status === ExamPaperGovernanceStatusCode.RECTIFICATION_REQUIRED
})
const paperGovernanceEditHint = computed(() => paperGovernanceEditable.value
  ? '维护当前考试实际使用的试卷、答案、评分标准和逐题结构'
  : '命题资料已完成核验或进入签审；请等待签审结论，或在退回整改后修改')

const submitApprovalBlocked = computed(
  () => !paperGovernance.value?.governance || paperGovernance.value.governance.status !== ExamPaperGovernanceStatusCode.RULE_CHECKED,
)
const submitApprovalHint = computed(() =>
  submitApprovalBlocked.value ? '须先完成并通过命题规则核验' : '提交后由本场已指定的审核教师依次处理',
)
const canApproveCurrentReviewer = computed(() => paperGovernance.value?.currentUserCanApprove === true)

async function loadPaperGovernance(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    paperGovernance.value = null
    return
  }
  try {
    const governance = await getExamPaperGovernance(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    paperGovernance.value = governance
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    showUserError(error, '命题治理资料加载失败')
  }
}

async function handleCheckGovernance(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId || checkingGovernance.value) {
    return
  }
  const generation = examLoadGeneration
  checkingGovernance.value = true
  try {
    const governance = await checkExamPaperGovernance(examId)
    if (generation !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    paperGovernance.value = governance
    void message.success('命题规则核验已完成')
  } catch (error) {
    if (generation !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    showUserError(error, '命题规则核验失败')
  } finally {
    if (generation === examLoadGeneration && selectedExamId.value === examId) {
      checkingGovernance.value = false
    }
  }
}

async function handleSubmitApproval(): Promise<void> {
  if (!selectedExamId.value || submitApprovalBlocked.value || submittingApproval.value) return
  submittingApproval.value = true
  try {
    await submitExamPaperGovernanceApproval(selectedExamId.value)
    await loadPaperGovernance()
    void message.success('已提交指定审核教师处理')
  } catch (error) {
    showUserError(error, '提交指定教师审核失败')
  } finally {
    submittingApproval.value = false
  }
}

function openApprovalModal(): void {
  approvalForm.approvalAction = ExamPaperApprovalActionCode.APPROVED
  approvalForm.comment = ''
  approvalModalOpen.value = true
}

async function handleApproval(): Promise<void> {
  if (!selectedExamId.value || !canApproveCurrentReviewer.value || !approvalForm.comment.trim() || approvingGovernance.value) {
    showFormValidationMessage('请填写签审意见')
    return
  }
  approvingGovernance.value = true
  try {
    await approveExamPaperGovernance({
      examId: selectedExamId.value,
      approvalAction: approvalForm.approvalAction,
      comment: approvalForm.comment.trim(),
    })
    approvalModalOpen.value = false
    await loadPaperGovernance()
    void message.success('命题签审已提交')
  } catch (error) {
    showUserError(error, '命题签审失败')
  } finally {
    approvingGovernance.value = false
  }
}

/** 下载本场已受控的试卷原件，下载权限由后端按主考/指定审核教师校验。 */
async function handleSourcePaperDownload({ key }: { key: string | number }): Promise<void> {
  if (!selectedExamId.value || !paperGovernance.value) return
  const paperSet = paperGovernance.value.paperSets.find((item) => item.paperCode === String(key))
  if (!paperSet) return
  await handleBlobDownload(
    () => downloadExamPaperSource(selectedExamId.value!, paperSet.paperCode),
    `${paperSet.paperName || `${paperSet.paperCode}卷`}.pdf`,
    { errorMessage: '下载受控试卷失败' },
  )
}

async function handleSaveGovernance(
  payload: import('@/apis/mark/paper-governance').ExamPaperGovernanceSaveRequest,
): Promise<void> {
  if (savingGovernance.value) return
  savingGovernance.value = true
  try {
    await saveExamPaperGovernance(payload)
    paperGovernanceDrawerOpen.value = false
    await loadPaperGovernance()
    void message.success('命题计划与试卷组已保存，请重新执行规则核验')
  } catch (error) {
    showUserError(error, '保存命题资料失败')
  } finally {
    savingGovernance.value = false
  }
}
// 加载失败：toast 提示，主区保持空态/列表壳
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })

const packageSignalMetrics = computed((): SignalMetric[] => {
  const panel = printPackagePanel.value
  if (!panel) {
    return [{
      key: 'packages',
      label: '印刷包',
      value: '—',
      tone: 'gray',
    }]
  }
  const metrics: SignalMetric[] = [
    {
      key: 'packages',
      label: '印刷包',
      value: panel.packageCount,
      unit: '个',
      tone: 'blue',
    },
    {
      key: 'generated',
      label: '已生成',
      value: panel.generatedPackageCount,
      unit: '个',
      tone: panel.generatedPackageCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'items',
      label: '历史明细',
      value: panel.totalItemCount,
      unit: '份',
      tone: 'gray',
    },
    {
      key: 'candidates',
      label: '名册（独立）',
      value: panel.candidateCount,
      unit: '人',
      tone: 'gray',
    },
  ]
  if (panel.coverageRate != null) {
    metrics.push({
      key: 'coverage',
      label: '覆盖比例',
      value: `${panel.coverageRate}%`,
      tone: panel.coverageRate >= 100 ? 'green' : 'orange',
    })
  }
  metrics.push({
    key: 'ready',
    label: '印刷就绪',
    value: panel.printPackageReady ? '是' : '否',
    tone: panel.printPackageReady ? 'green' : 'orange',
  })
  return metrics
})

const packageColumns: ColumnType<ExamPrintPackageResponse>[] = [
  { title: '名称', key: 'packageName', width: 200, ellipsis: true, fixed: 'left' },
  { title: '编号', dataIndex: 'packageNo', key: 'packageNo', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '人数', dataIndex: 'itemCount', key: 'itemCount', width: 80, align: 'right' },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 170 },
  { title: '封装备注', key: 'sealRemark', ellipsis: true },
  { title: '操作', key: 'actions', width: 220 },
]

async function loadPrintPackagePanel(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    printPackagePanel.value = null
    return
  }
  panelLoadFailed.value = false
  try {
    const panel = await getPrintPackagePanel(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    printPackagePanel.value = panel
    panelLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    panelLoadFailed.value = true
    showUserError(error, '印刷包看板加载失败')
  }
}

async function loadPackageList(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  loading.value = true
  listLoadFailed.value = false
  try {
    const res = await pagePrintPackages({
      examId,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    packageList.value = res.list
    pagination.pageNum = res.pageNum
    pagination.pageSize = res.pageSize
    pagination.total = res.total
    listLoadFailed.value = false
  } catch (e) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    listLoadFailed.value = true
    showUserError(e, '印刷包列表加载失败')
  } finally {
    if (expectedGeneration === examLoadGeneration && selectedExamId.value === examId) {
      loading.value = false
    }
  }
}

function handlePackagePageChange(pageEvent: { current: number, pageSize: number }): void {
  pagination.pageNum = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadPackageList(examLoadGeneration)
}

// ─── 状态展示 ───────────────────────────────────────────────────────

function statusTone(status: ExamPrintPackageResponse['status']): BadgeTone {
  return strictEnumTone(PRINT_PACKAGE_STATUS_TONE, status, '印刷包状态')
}

function statusLabel(status: ExamPrintPackageResponse['status']): string {
  return strictEnumLabel(PrintPackageStatusDescription, status, '印刷包状态')
}

// ─── 生成印刷包 ──────────────────────────────────────────────────

const generateModalVisible = ref(false)
const generating = ref(false)

const generateForm = reactive({
  packageNo: '',
  packageName: '',
  sealRemark: '',
})

function openGenerateModal() {
  if (!canManageOwnerPrintPackageWrites.value) {
    return
  }
  if (generateBlocked.value) {
    void message.warning(generateDisabledReason.value ?? '考试准备未完成，暂不可生成印刷包')
    return
  }
  generateForm.packageNo = ''
  generateForm.packageName = ''
  generateForm.sealRemark = ''
  generateModalVisible.value = true
}

async function handleGenerate() {
  if (!canManageOwnerPrintPackageWrites.value) {
    return
  }
  if (!selectedExamId.value) return
  if (generating.value) return
  if (!generateForm.packageNo.trim()) {
    showFormValidationMessage('请填写印刷包编号')
    return
  }
  if (!generateForm.packageName.trim()) {
    showFormValidationMessage('请填写印刷包名称')
    return
  }

  generating.value = true
  try {
    await generatePrintPackage({
      examId: selectedExamId.value,
      packageNo: generateForm.packageNo.trim(),
      packageName: generateForm.packageName.trim(),
      sealRemark: generateForm.sealRemark?.trim() || undefined,
    })
    void message.success('印刷包生成成功')
    generateModalVisible.value = false
    pagination.pageNum = 1
    await Promise.all([
      loadPackageList(examLoadGeneration),
      loadPrintPackagePanel(examLoadGeneration),
    ])
    await refreshSnapshot()
  } catch (error) {
    if (error instanceof Error && isLayoutNotReadyError(error)) {
      showUserError(error, '请先完成制卷设计并生成可打印便携文档，再生成印刷包')
      return
    }
    showUserError(error, '印刷包生成失败，请确认制卷设计可打印便携文档已就绪')
  } finally {
    generating.value = false
  }
}

// ─── 下载印刷包 PDF ──────────────────────────────────────────────────

async function downloadPackagePdf(pkg: ExamPrintPackageResponse) {
  try {
    await downloadFile({ nodeId: pkg.packageFileId })
  } catch (error) {
    showUserError(error, '印刷包文件下载失败')
  }
}

// ─── PDF 预览 ──────────────────────────────────────────────────────

const previewModalOpen = ref(false)
const previewPackageFileId = ref('')

function previewPackagePdf(pkg: ExamPrintPackageResponse): void {
  previewPackageFileId.value = pkg.packageFileId
  previewModalOpen.value = true
}

// ─── 印刷包明细 ──────────────────────────────────────────────────────

const detailModalVisible = ref(false)
const detailLoading = ref(false)
const detailPackage = ref<ExamPrintPackageResponse | null>(null)
const detailItems = ref<PrintPackageItemVO[]>([])
const detailPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

function buildPackageActions(pkg: ExamPrintPackageResponse): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: '查看明细' },
    { key: 'preview', label: '预览', tone: 'primary', hidden: !pkg.packageFileId },
    { key: 'download', label: '下载便携文档', hidden: !pkg.packageFileId },
  ]
}

function handlePackageAction(key: string, pkg: ExamPrintPackageResponse): void {
  switch (key) {
    case 'detail':
      void viewDetail(pkg)
      break
    case 'preview':
      void previewPackagePdf(pkg)
      break
    case 'download':
      void downloadPackagePdf(pkg)
      break
  }
}

async function viewDetail(pkg: ExamPrintPackageResponse) {
  detailPackage.value = pkg
  detailItems.value = []
  detailPagination.pageNum = 1
  detailModalVisible.value = true
  await loadDetailItems(examLoadGeneration)
}

async function loadDetailItems(expectedGeneration = examLoadGeneration): Promise<void> {
  const pkg = detailPackage.value
  const examId = selectedExamId.value
  if (!pkg || !examId) {
    return
  }
  detailLoading.value = true
  try {
    const page = await pagePrintPackageItems({
      examId: pkg.examId,
      printPackageId: pkg.printPackageId,
      pageNum: detailPagination.pageNum,
      pageSize: detailPagination.pageSize,
    })
    if (
      expectedGeneration !== examLoadGeneration
      || selectedExamId.value !== examId
      || detailPackage.value?.printPackageId !== pkg.printPackageId
    ) {
      return
    }
    detailItems.value = page.list
    detailPagination.total = page.total
    if (page.pageNum != null) {
      detailPagination.pageNum = page.pageNum
    }
    if (page.pageSize != null) {
      detailPagination.pageSize = page.pageSize
    }
  } catch (error) {
    if (
      expectedGeneration !== examLoadGeneration
      || selectedExamId.value !== examId
      || detailPackage.value?.printPackageId !== pkg.printPackageId
    ) {
      return
    }
    showUserError(error, '印刷包明细加载失败')
  } finally {
    if (
      expectedGeneration === examLoadGeneration
      && selectedExamId.value === examId
      && detailPackage.value?.printPackageId === pkg.printPackageId
    ) {
      detailLoading.value = false
    }
  }
}

function handleDetailPageChange(pageEvent: { current: number, pageSize: number }): void {
  detailPagination.pageNum = pageEvent.current
  detailPagination.pageSize = pageEvent.pageSize
  void loadDetailItems(examLoadGeneration)
}

function detailItemStatusTone(status: PrintPackageItemStatusCode): BadgeTone {
  return strictEnumTone(PRINT_PACKAGE_ITEM_STATUS_TONE, status, '印刷包明细状态')
}

function detailItemStatusLabel(status: PrintPackageItemStatusCode): string {
  return strictEnumLabel(PrintPackageItemStatusDescription, status, '印刷包明细状态')
}

const detailColumns: ColumnType[] = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 120, fixed: 'left' },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考场', dataIndex: 'examRoom', key: 'examRoom', width: 120 },
  { title: '座位号', dataIndex: 'seatNo', key: 'seatNo', width: 80 },
  { title: '二维码', dataIndex: 'qrCode', key: 'qrCode', ellipsis: true },
  { title: '条形码', dataIndex: 'barCode', key: 'barCode', ellipsis: true },
  { title: '防伪码', dataIndex: 'securityCode', key: 'securityCode', width: 120 },
  { title: '状态', key: 'status', width: 90 },
]

// ─── 初始化 ──────────────────────────────────────────────────────────

function clearExamScopedState(): void {
  examDetail.value = null
  packageList.value = []
  printPackagePanel.value = null
  paperGovernance.value = null
  pagination.pageNum = 1
  pagination.total = 0
  examDetailError.value = false
  listLoadFailed.value = false
  panelLoadFailed.value = false
  detailModalVisible.value = false
  detailPackage.value = null
  detailItems.value = []
  detailPagination.pageNum = 1
  detailPagination.total = 0
  generateModalVisible.value = false
  previewModalOpen.value = false
  previewPackageFileId.value = ''
  checkingGovernance.value = false
  submittingApproval.value = false
  approvingGovernance.value = false
  generating.value = false
}

async function loadExamDetailForPrep(
  examId: string,
  expectedGeneration = examLoadGeneration,
): Promise<boolean> {
  examDetailLoading.value = true
  examDetailError.value = false
  try {
    const detail = await getExamDetail(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return false
    }
    examDetail.value = detail
    return true
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return false
    }
    examDetail.value = null
    examDetailError.value = true
    showUserError(error, '考试详情加载失败')
    return false
  } finally {
    if (expectedGeneration === examLoadGeneration && selectedExamId.value === examId) {
      examDetailLoading.value = false
    }
  }
}

async function reloadPrintPackagePage(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  const detailLoaded = await loadExamDetailForPrep(examId, expectedGeneration)
  if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
    return
  }
  if (!detailLoaded || !printPackageApplicable.value) {
    return
  }
  await Promise.all([
    loadPackageList(expectedGeneration),
    loadPrintPackagePanel(expectedGeneration),
    loadPaperGovernance(expectedGeneration),
  ])
}

watch(
  selectedExamId,
  (val) => {
    const generation = ++examLoadGeneration
    clearExamScopedState()
    examDetailLoading.value = Boolean(val)
    if (val) {
      void reloadPrintPackagePage(generation)
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.print-package-page {
  &__empty {
    margin-top: var(--dp-space-component);
  }

  :deep(.ui-alert-strip) {
    margin-bottom: var(--dp-space-block);
  }

  &__blocking-strip {
    margin-bottom: var(--dp-space-block);
  }

  &__flow-hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    line-height: 1.5;
  }

  &__scenario {
    margin-bottom: var(--dp-space-block);
  }

  &__generate-impact {
    margin-bottom: var(--dp-space-component);
  }

  &__generate-impact-list {
    margin: 0;
    padding-left: 1.25em;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
    line-height: 1.6;
  }

  &__list-card {
    margin-top: var(--dp-space-component-tight);
  }
}
</style>
