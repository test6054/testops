<template>
  <StageWorkbenchShell class="print-package-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" show-title title="印刷包" :subtitle="selectedExamId ? `${pagination.total} 条` : undefined">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template #actions>
          <UiTooltip
            v-if="printPackageApplicable === true && canManageOwnerPrintPackageWrites === true"
            :title="paperGovernanceEditHint"
          >
            <UiButton size="sm" variant="outline" :disabled="paperGovernanceEditable !== true" @click="openPaperGovernanceDrawer">
              维护命题资料
            </UiButton>
          </UiTooltip>
          <UiTooltip
            v-if="printPackageApplicable === true && canManageOwnerPrintPackageWrites === true"
            :title="paperGovernanceActionHint"
          >
            <UiButton
              size="sm"
              variant="outline"
              :loading="checkingGovernance === true"
              :disabled="!selectedExamId"
              @click="handleCheckGovernance"
            >
              命题规则核验
            </UiButton>
          </UiTooltip>
          <UiTooltip v-if="printPackageApplicable === true && canManageOwnerPrintPackageWrites === true" :title="submitApprovalHint">
            <UiButton
              size="sm"
              variant="outline"
              :loading="submittingApproval === true"
              :disabled="submitApprovalBlocked === true"
              @click="handleSubmitApproval"
            >
              提交指定教师审核
            </UiButton>
          </UiTooltip>
          <UiButton
            v-if="printPackageApplicable === true && canApproveCurrentReviewer === true"
            size="sm"
            variant="primary"
            @click="openApprovalModal"
          >
            处理当前审核
          </UiButton>
          <a-dropdown v-if="printPackageApplicable === true && (paperGovernance?.paperSets.length ?? 0) > 0" placement="bottomRight">
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
            v-if="printPackageApplicable === true && canManageOwnerPrintPackageWrites === true"
            :title="generateDisabledReason"
          >
            <UiButton
              variant="outline"
              size="sm"
              :loading="generating === true"
              :disabled="generateBlocked === true"
              @click="openGenerateModal"
            >
              生成印刷包
            </UiButton>
          </UiTooltip>
        </template>
      </ContextBar>
    </template>

    <WorkflowReadinessPanel
      v-if="selectedExamId && printPackageApplicable === true && printPackagePrepWorkflowSteps.length > 0"
      title="完成以下准备步骤后可生成印刷包"
      :steps="printPackagePrepWorkflowSteps"
    />

    <UiAlertStrip
      v-if="selectedExamId && printPackageApplicable === true && paperGovernanceAlert"
      :tone="paperGovernanceAlert.tone"
      :title="paperGovernanceAlert.title"
      :description="paperGovernanceAlert.description"
      :closable="false"
    />

    <template v-if="selectedExamId && printPackageApplicable === true" #signal>
      <SignalBand layout="spotlight" compact variant="panel" :metrics="packageSignalMetrics" />
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
        v-else-if="printPackageApplicable !== true"
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
          v-if="listLoadFailed || panelLoadFailed || governanceLoadFailed"
          tone="error"
          title="制卷与印刷合同加载失败"
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
            :loading="loading === true"
            :load-error="listLoadFailed === true"
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
              <template v-else-if="column.key === 'copyCount'">
                <div class="print-package-page__copy-ledger">
                  <span>计划 {{ record.plannedCopies }} · 实印 {{ record.actualPrintedCopies ?? '—' }}</span>
                  <span v-if="record.issuedCopies !== undefined">
                    发放 {{ record.issuedCopies }} · 校内留存 {{ record.retainedUnissuedCopies }}
                  </span>
                  <span v-if="record.returnedUnusedCopies !== undefined">
                    实际使用 {{ record.usedCopies }} · 考点回收 {{ record.returnedUnusedCopies }}
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'sealRemark'">
                {{ record.sealRemark || '未填写封装备注' }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :max-visible="2"
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
          :confirm-loading="generating === true"
          @ok="handleGenerate"
        >
          <UiAlertStrip
            tone="info"
            title="本次生成影响"
            :closable="false"
            class="print-package-page__generate-impact"
          >
            <ul class="print-package-page__generate-impact-list">
              <li>将基于当前制卷设计生成{{ printMasterKindLabel }}空白物理包，供考场按座位印制</li>
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
            <UiFormItem label="试卷用途" required>
              <a-select
                v-model:value="generateForm.paperCode"
                :options="paperGovernance?.paperSets.map((item) => ({
                  value: item.paperCode,
                  label: `${item.paperCode}卷 · ${item.paperName}`,
                })) ?? []"
                placeholder="选择 A、B 或备用卷"
              />
            </UiFormItem>
            <UiFormItem label="计划印数" required>
              <a-input-number v-model:value="generateForm.plannedCopies" :min="1" :precision="0" />
            </UiFormItem>
            <UiFormItem label="加印损耗" required>
              <a-input-number v-model:value="generateForm.spoilageAllowanceCopies" :min="0" :precision="0" />
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

        <UiDrawer
          v-model:open="transitionModalVisible"
          :title="transitionTarget ? statusLabel(transitionTarget) : '推进印务状态'"
          :width="520"
          :confirm-loading="transitioning"
          @ok="handleTransition"
        >
          <UiForm layout="vertical">
            <UiFormItem v-if="transitionTarget === PrintPackageStatusCode.RELEASED_TO_PRINTER" label="承印单位" required>
              <UiInput v-model="transitionForm.printerName" :maxlength="200" />
            </UiFormItem>
            <UiFormItem
              v-if="transitionTarget === PrintPackageStatusCode.RELEASED_TO_PRINTER
                || transitionTarget === PrintPackageStatusCode.ISSUED_TO_EXAM_SITE
                || transitionTarget === PrintPackageStatusCode.RECONCILED"
              :label="transitionTarget === PrintPackageStatusCode.RECONCILED ? '核销清点经手人' : '交接经手人'"
              required
            >
              <UiInput v-model="transitionForm.handoverOperator" :maxlength="200" />
            </UiFormItem>
            <UiFormItem v-if="transitionTarget === PrintPackageStatusCode.PRINTED" label="实际印毕份数" required>
              <a-input-number v-model:value="transitionForm.actualPrintedCopies" :min="1" :precision="0" />
            </UiFormItem>
            <UiFormItem
              v-if="transitionTarget === PrintPackageStatusCode.SEALED
                || (transitionTarget === PrintPackageStatusCode.VOIDED
                  && transitionPackage?.actualPrintedCopies !== undefined)"
              label="监督销毁份数"
              required
            >
              <a-input-number v-model:value="transitionForm.destroyedSpoilageCopies" :min="0" :precision="0" />
            </UiFormItem>
            <UiFormItem v-if="transitionTarget === PrintPackageStatusCode.ISSUED_TO_EXAM_SITE" label="发放考点份数" required>
              <a-input-number v-model:value="transitionForm.issuedCopies" :min="1" :precision="0" />
            </UiFormItem>
            <UiAlertStrip
              v-if="transitionTarget === PrintPackageStatusCode.RECONCILED && transitionPackage"
              tone="info"
              title="考后印务清点"
              :description="`计划 ${transitionPackage.plannedCopies} 份；考点已发放 ${transitionPackage.issuedCopies} 份；校内未发留存 ${transitionPackage.retainedUnissuedCopies} 份。`"
              :closable="false"
              dense
            />
            <UiFormItem v-if="transitionTarget === PrintPackageStatusCode.RECONCILED" label="考点未使用回收份数" required>
              <a-input-number
                v-model:value="transitionForm.returnedUnusedCopies"
                :min="0"
                :max="transitionPackage?.issuedCopies"
                :precision="0"
              />
            </UiFormItem>
            <UiFormItem
              :label="transitionTarget === PrintPackageStatusCode.VOIDED ? '作废原因' : '环节备注'"
              :required="transitionTarget === PrintPackageStatusCode.VOIDED"
            >
              <UiTextarea v-model="transitionForm.remark" :maxlength="500" :rows="3" />
            </UiFormItem>
          </UiForm>
        </UiDrawer>

        <UiDrawer
          v-model:open="packageLedgerOpen"
          :title="packageLedger?.packageName ? `${packageLedger.packageName} · 印务台账` : '印务台账'"
          :width="760"
          hide-footer
        >
          <template v-if="packageLedger">
            <UiDescriptions bordered :column="2" size="sm">
              <UiDescriptionsItem label="印刷包编号">{{ packageLedger.packageNo }}</UiDescriptionsItem>
              <UiDescriptionsItem label="试卷用途">{{ packageLedger.paperCode }} 卷</UiDescriptionsItem>
              <UiDescriptionsItem label="当前状态">
                <UiTag :tone="statusTone(packageLedger.status)" size="sm">
                  {{ statusLabel(packageLedger.status) }}
                </UiTag>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="承印单位">{{ packageLedger.printerName || '尚未送印' }}</UiDescriptionsItem>
              <UiDescriptionsItem label="计划 / 损耗">
                {{ packageLedger.plannedCopies }} / {{ packageLedger.spoilageAllowanceCopies }} 份
              </UiDescriptionsItem>
              <UiDescriptionsItem label="实印 / 销毁">
                {{ packageLedger.actualPrintedCopies ?? '—' }} / {{ packageLedger.destroyedSpoilageCopies ?? '—' }} 份
              </UiDescriptionsItem>
              <UiDescriptionsItem label="考点发放 / 校内留存">
                {{ packageLedger.issuedCopies ?? '—' }} / {{ packageLedger.retainedUnissuedCopies ?? '—' }} 份
              </UiDescriptionsItem>
              <UiDescriptionsItem label="实际使用 / 考点回收">
                {{ packageLedger.usedCopies ?? '—' }} / {{ packageLedger.returnedUnusedCopies ?? '—' }} 份
              </UiDescriptionsItem>
              <UiDescriptionsItem label="最近交接经手人">{{ packageLedger.handoverOperator || '尚无交接' }}</UiDescriptionsItem>
              <UiDescriptionsItem label="封装备注">{{ packageLedger.sealRemark || '未填写' }}</UiDescriptionsItem>
            </UiDescriptions>
            <section class="print-package-page__ledger-events">
              <h3>状态流转记录</h3>
              <ol>
                <li v-for="event in packageLedgerEvents" :key="event.status">
                  <UiTag :tone="event.tone" size="sm">{{ event.label }}</UiTag>
                  <span>{{ event.time }}</span>
                </li>
              </ol>
            </section>
          </template>
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
        <a-modal v-model:open="approvalModalOpen" title="命题资料审核" :confirm-loading="approvingGovernance === true" @ok="handleApproval">
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
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamWorkbenchPrintPackagePanelResponse } from '@/apis/mark/exam-progress'
import type { ExamPaperGovernanceResponse } from '@/apis/mark/paper-governance'
import type { ExamPrintPackageResponse } from '@/apis/mark/print-package'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
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
  pagePrintPackages,
  PRINT_PACKAGE_EXTERNAL_PRINT_HINT,
  PRINT_PACKAGE_FLOW_HINT,
  PRINT_PACKAGE_STATUS_TONE,
  PrintPackageStatusCode,
  PrintPackageStatusDescription,
  transitionPrintPackage,
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
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
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
    printPackageGenerateGate.value.generateBlocked === true
    || governanceApprovedForPrint.value !== true
    || governanceLoadFailed.value === true
    || panelLoadFailed.value === true
    || listLoadFailed.value === true,
)
const printPackagePrepWorkflowSteps = computed(() => printPackageGenerateGate.value.panelSteps)
const generateDisabledReason = computed(() => {
  if (panelLoadFailed.value === true || listLoadFailed.value === true || governanceLoadFailed.value === true) {
    return '制卷与印刷合同加载失败，请重新进入本场考试后再操作'
  }
  if (governanceApprovedForPrint.value !== true) {
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
const printMasterKindLabel = computed(() =>
  examDetail.value?.materialLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET
    ? '试题卷+答题纸'
    : '单独试卷',
)
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
const governanceLoadFailed = ref(false)
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
  if (governanceLoadFailed.value === true) {
    return {
      tone: 'error' as const,
      title: '命题治理资料加载失败',
      description: '当前无法确认试卷组、签审状态与受控源文件，已禁止生成印刷包。',
    }
  }
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
  const failed = paperGovernance.value?.ruleChecks.filter((item) => item.passedFlag !== true) ?? []
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
  return (
    !status
    || status === ExamPaperGovernanceStatusCode.DRAFT
    || status === ExamPaperGovernanceStatusCode.RECTIFICATION_REQUIRED
  )
})
const paperGovernanceEditHint = computed(() => paperGovernanceEditable.value === true
  ? '维护当前考试实际使用的试卷、答案、评分标准和逐题结构'
  : '命题资料已完成核验或进入签审；请等待签审结论，或在退回整改后修改')

const submitApprovalBlocked = computed(
  () =>
    !paperGovernance.value?.governance
    || paperGovernance.value.governance.status !== ExamPaperGovernanceStatusCode.RULE_CHECKED,
)
const submitApprovalHint = computed(() =>
  submitApprovalBlocked.value === true ? '须先完成并通过命题规则核验' : '提交后由本场已指定的审核教师依次处理',
)
const canApproveCurrentReviewer = computed(() => paperGovernance.value?.currentUserCanApprove === true)

async function loadPaperGovernance(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    paperGovernance.value = null
    governanceLoadFailed.value = false
    return
  }
  governanceLoadFailed.value = false
  try {
    const governance = await getExamPaperGovernance(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    paperGovernance.value = governance
    governanceLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    paperGovernance.value = null
    governanceLoadFailed.value = true
    showUserError(error, '命题治理资料加载失败')
  }
}

function openPaperGovernanceDrawer(): void {
  // MVR-926：与顶栏 v-if / paperGovernanceEditable 同源二次闸
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可维护命题资料')
    return
  }
  if (paperGovernanceEditable.value !== true) {
    void message.warning(paperGovernanceEditHint.value)
    return
  }
  paperGovernanceDrawerOpen.value = true
}

async function handleCheckGovernance(): Promise<void> {
  // MVR-926：与顶栏 v-if / BE requireExamOwnerPermission 同源二次闸
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可执行命题规则核验')
    return
  }
  const examId = selectedExamId.value
  if (!examId || checkingGovernance.value === true) {
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
  // MVR-926：与 canManageOwnerPrintPackageWrites ∧ submitApprovalBlocked 同源二次闸
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可提交命题签审')
    return
  }
  if (!selectedExamId.value || submitApprovalBlocked.value === true || submittingApproval.value === true) {
    if (submitApprovalBlocked.value === true) {
      void message.warning(submitApprovalHint.value)
    }
    return
  }
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
  // MVR-926：仅当前签审人可打开处理弹窗
  if (canApproveCurrentReviewer.value !== true) {
    void message.warning('当前账号不是本场命题签审处理人')
    return
  }
  approvalForm.approvalAction = ExamPaperApprovalActionCode.APPROVED
  approvalForm.comment = ''
  approvalModalOpen.value = true
}

async function handleApproval(): Promise<void> {
  // MVR-926：与 canApproveCurrentReviewer / 按钮显隐同源二次闸
  if (canApproveCurrentReviewer.value !== true) {
    void message.warning('当前账号不是本场命题签审处理人')
    return
  }
  if (!selectedExamId.value || !approvalForm.comment.trim() || approvingGovernance.value) {
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
  // MVR-926：与 canManageOwnerPrintPackageWrites ∧ paperGovernanceEditable 同源二次闸
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可维护命题资料')
    return
  }
  if (paperGovernanceEditable.value !== true) {
    void message.warning(paperGovernanceEditHint.value)
    return
  }
  if (savingGovernance.value === true) return
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
      key: 'candidates',
      label: '参考印数',
      value: panel.candidateCount,
      unit: '人',
      tone: 'gray',
    },
  ]
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
  { title: '卷别', dataIndex: 'paperCode', key: 'paperCode', width: 80 },
  { title: '编号', dataIndex: 'packageNo', key: 'packageNo', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '印务数量', key: 'copyCount', width: 220 },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 170 },
  { title: '封装备注', key: 'sealRemark', ellipsis: true },
  { title: '主行动', key: 'actions', width: 260 },
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

const transitionModalVisible = ref(false)
const transitioning = ref(false)
const transitionPackage = ref<ExamPrintPackageResponse | null>(null)
const transitionTarget = ref<PrintPackageStatusCode | null>(null)
const transitionForm = reactive({
  actualPrintedCopies: undefined as number | undefined,
  destroyedSpoilageCopies: undefined as number | undefined,
  issuedCopies: undefined as number | undefined,
  returnedUnusedCopies: undefined as number | undefined,
  printerName: '',
  handoverOperator: '',
  remark: '',
})

function nextPrintStatus(status: PrintPackageStatusCode): PrintPackageStatusCode | null {
  return {
    [PrintPackageStatusCode.GENERATED]: PrintPackageStatusCode.RELEASED_TO_PRINTER,
    [PrintPackageStatusCode.RELEASED_TO_PRINTER]: PrintPackageStatusCode.PRINTED,
    [PrintPackageStatusCode.PRINTED]: PrintPackageStatusCode.SEALED,
    [PrintPackageStatusCode.SEALED]: PrintPackageStatusCode.ISSUED_TO_EXAM_SITE,
    [PrintPackageStatusCode.ISSUED_TO_EXAM_SITE]: PrintPackageStatusCode.RECONCILED,
    [PrintPackageStatusCode.RECONCILED]: null,
    [PrintPackageStatusCode.VOIDED]: null,
  }[status]
}

function openTransition(pkg: ExamPrintPackageResponse, target: PrintPackageStatusCode): void {
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可推进印务状态')
    return
  }
  transitionPackage.value = pkg
  transitionTarget.value = target
  Object.assign(transitionForm, {
    actualPrintedCopies: undefined,
    destroyedSpoilageCopies: undefined,
    issuedCopies: undefined,
    returnedUnusedCopies: undefined,
    printerName: pkg.printerName ?? '',
    handoverOperator: '',
    remark: '',
  })
  transitionModalVisible.value = true
}

async function handleTransition(): Promise<void> {
  const pkg = transitionPackage.value
  const target = transitionTarget.value
  if (!pkg || !target || !selectedExamId.value || transitioning.value) return
  if (canManageOwnerPrintPackageWrites.value !== true) {
    void message.warning('仅本场主考可推进印务状态')
    return
  }
  if (target === PrintPackageStatusCode.RELEASED_TO_PRINTER
    && (!transitionForm.printerName.trim() || !transitionForm.handoverOperator.trim())) {
    showFormValidationMessage('送印必须填写承印单位和交接经手人')
    return
  }
  if (target === PrintPackageStatusCode.PRINTED
    && (transitionForm.actualPrintedCopies === undefined
      || transitionForm.actualPrintedCopies < pkg.plannedCopies
      || transitionForm.actualPrintedCopies > pkg.plannedCopies + pkg.spoilageAllowanceCopies)) {
    showFormValidationMessage(`实际印毕份数须在 ${pkg.plannedCopies} 至 ${pkg.plannedCopies + pkg.spoilageAllowanceCopies} 之间`)
    return
  }
  if (target === PrintPackageStatusCode.SEALED
    && transitionForm.destroyedSpoilageCopies !== (pkg.actualPrintedCopies ?? 0) - pkg.plannedCopies) {
    showFormValidationMessage(`密封前须监督销毁 ${(pkg.actualPrintedCopies ?? 0) - pkg.plannedCopies} 份加印损耗材料`)
    return
  }
  if (target === PrintPackageStatusCode.ISSUED_TO_EXAM_SITE
    && (transitionForm.issuedCopies === undefined
      || transitionForm.issuedCopies <= 0
      || transitionForm.issuedCopies > pkg.plannedCopies
      || !transitionForm.handoverOperator.trim())) {
    showFormValidationMessage('交接考点须填写经手人，发放份数不得超过计划印数')
    return
  }
  if (target === PrintPackageStatusCode.RECONCILED
    && (transitionForm.returnedUnusedCopies === undefined
      || transitionForm.returnedUnusedCopies < 0
      || pkg.issuedCopies === undefined
      || transitionForm.returnedUnusedCopies > pkg.issuedCopies
      || !transitionForm.handoverOperator.trim())) {
    showFormValidationMessage('请填写核销清点经手人，考点未使用回收份数不得超过发放份数')
    return
  }
  if (target === PrintPackageStatusCode.VOIDED
    && (!transitionForm.remark.trim()
      || (pkg.actualPrintedCopies !== undefined
        && transitionForm.destroyedSpoilageCopies !== pkg.actualPrintedCopies))) {
    showFormValidationMessage(pkg.actualPrintedCopies === undefined
      ? '请填写作废原因'
      : `作废前须填写原因并监督销毁全部 ${pkg.actualPrintedCopies} 份实印材料`)
    return
  }
  transitioning.value = true
  try {
    await transitionPrintPackage({
      examId: selectedExamId.value,
      printPackageId: pkg.printPackageId,
      targetStatus: target,
      ...transitionForm,
      printerName: transitionForm.printerName.trim() || undefined,
      handoverOperator: transitionForm.handoverOperator.trim() || undefined,
      remark: transitionForm.remark.trim() || undefined,
    })
    void message.success(`印刷包已${statusLabel(target)}`)
    transitionModalVisible.value = false
    await Promise.all([
      loadPackageList(examLoadGeneration),
      loadPrintPackagePanel(examLoadGeneration),
    ])
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '推进印务状态失败')
  } finally {
    transitioning.value = false
  }
}

// ─── 生成印刷包 ──────────────────────────────────────────────────

const generateModalVisible = ref(false)
const generating = ref(false)

const generateForm = reactive({
  packageNo: '',
  packageName: '',
  sealRemark: '',
  paperCode: '',
  plannedCopies: 1,
  spoilageAllowanceCopies: 0,
})

function openGenerateModal() {
  if (canManageOwnerPrintPackageWrites.value !== true) {
    return
  }
  if (generateBlocked.value === true) {
    void message.warning(generateDisabledReason.value ?? '考试准备未完成，暂不可生成印刷包')
    return
  }
  generateForm.packageNo = ''
  generateForm.packageName = ''
  generateForm.sealRemark = ''
  generateForm.paperCode = paperGovernance.value?.paperSets[0]?.paperCode ?? ''
  generateForm.plannedCopies = Math.max(printPackagePanel.value?.candidateCount ?? 1, 1)
  generateForm.spoilageAllowanceCopies = 0
  generateModalVisible.value = true
}

async function handleGenerate() {
  if (canManageOwnerPrintPackageWrites.value !== true) {
    return
  }
  if (!selectedExamId.value) return
  if (generating.value === true) return
  if (!generateForm.packageNo.trim()) {
    showFormValidationMessage('请填写印刷包编号')
    return
  }
  if (!generateForm.packageName.trim()) {
    showFormValidationMessage('请填写印刷包名称')
    return
  }
  if (!generateForm.paperCode || generateForm.plannedCopies <= 0) {
    showFormValidationMessage('请选择试卷用途并填写计划印数')
    return
  }

  generating.value = true
  try {
    await generatePrintPackage({
      examId: selectedExamId.value,
      packageNo: generateForm.packageNo.trim(),
      packageName: generateForm.packageName.trim(),
      paperCode: generateForm.paperCode,
      plannedCopies: generateForm.plannedCopies,
      spoilageAllowanceCopies: generateForm.spoilageAllowanceCopies,
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
      showUserError(error, '请先完成制卷设计并生成可打印 PDF，再生成印刷包')
      return
    }
    showUserError(error, '印刷包生成失败，请确认制卷设计可打印 PDF 已就绪')
  } finally {
    generating.value = false
  }
}

// ─── 下载印刷包 PDF ──────────────────────────────────────────────────

async function downloadPrintMaterial(fileId: string, materialName: string) {
  try {
    await downloadFile({ nodeId: fileId })
  } catch (error) {
    showUserError(error, `${materialName}下载失败`)
  }
}

// ─── PDF 预览 ──────────────────────────────────────────────────────

const previewModalOpen = ref(false)
const previewPackageFileId = ref('')
const packageLedgerOpen = ref(false)
const packageLedger = ref<ExamPrintPackageResponse | null>(null)

const packageLedgerEvents = computed(() => {
  const pkg = packageLedger.value
  if (!pkg) return []
  return [
    { status: PrintPackageStatusCode.GENERATED, label: '生成', time: pkg.generatedTime },
    { status: PrintPackageStatusCode.RELEASED_TO_PRINTER, label: '送印', time: pkg.releasedTime },
    { status: PrintPackageStatusCode.PRINTED, label: '印毕', time: pkg.printedTime },
    { status: PrintPackageStatusCode.SEALED, label: '密封', time: pkg.sealedTime },
    { status: PrintPackageStatusCode.ISSUED_TO_EXAM_SITE, label: '交接考点', time: pkg.issuedTime },
    { status: PrintPackageStatusCode.RECONCILED, label: '考后核销', time: pkg.reconciledTime },
    { status: PrintPackageStatusCode.VOIDED, label: '作废', time: pkg.voidedTime },
  ].filter((event): event is { status: PrintPackageStatusCode, label: string, time: string } => Boolean(event.time)).map(
    (event) => ({ ...event, tone: statusTone(event.status) }),
  )
})

function previewPackagePdf(pkg: ExamPrintPackageResponse): void {
  previewPackageFileId.value = pkg.packageFileId
  previewModalOpen.value = true
}

function openPackageLedger(pkg: ExamPrintPackageResponse): void {
  packageLedger.value = pkg
  packageLedgerOpen.value = true
}

/** 印务包行主行动：推进 > 预览 primary 置顶；台账/下载进次要。 */
function buildPackageActions(pkg: ExamPrintPackageResponse): UiTableRowActionItem[] {
  const nextStatus = nextPrintStatus(pkg.status)
  const canAdvance = Boolean(nextStatus) && canManageOwnerPrintPackageWrites.value === true
  const canPreview = Boolean(pkg.packageFileId)
  return [
    {
      key: 'advance',
      label: nextStatus ? statusLabel(nextStatus) : '推进',
      tone: 'primary',
      hidden: !canAdvance,
    },
    {
      key: 'preview',
      label: '预览母版',
      tone: canAdvance ? undefined : 'primary',
      hidden: !canPreview,
    },
    { key: 'ledger', label: '查看印务台账' },
    { key: 'download-package', label: '下载核对包', hidden: !pkg.packageFileId },
    { key: 'download-question', label: '下载试题卷', hidden: !pkg.questionPaperFileId },
    { key: 'download-answer', label: '下载答题纸', hidden: !pkg.answerBookletFileId },
    {
      key: 'void',
      label: '作废',
      tone: 'danger',
      hidden: pkg.status === PrintPackageStatusCode.ISSUED_TO_EXAM_SITE
        || pkg.status === PrintPackageStatusCode.RECONCILED
        || pkg.status === PrintPackageStatusCode.VOIDED
        || canManageOwnerPrintPackageWrites.value !== true,
    },
  ]
}

function handlePackageAction(key: string, pkg: ExamPrintPackageResponse): void {
  switch (key) {
    case 'ledger':
      openPackageLedger(pkg)
      break
    case 'preview':
      void previewPackagePdf(pkg)
      break
    case 'download-package':
      void downloadPrintMaterial(pkg.packageFileId, '印刷核对包')
      break
    case 'download-question':
      void downloadPrintMaterial(pkg.questionPaperFileId, '独立试题卷')
      break
    case 'download-answer':
      if (pkg.answerBookletFileId) {
        void downloadPrintMaterial(pkg.answerBookletFileId, '独立答题纸')
      }
      break
    case 'advance': {
      const target = nextPrintStatus(pkg.status)
      if (target) openTransition(pkg, target)
      break
    }
    case 'void':
      openTransition(pkg, PrintPackageStatusCode.VOIDED)
      break
  }
}

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
  governanceLoadFailed.value = false
  generateModalVisible.value = false
  previewModalOpen.value = false
  previewPackageFileId.value = ''
  packageLedgerOpen.value = false
  packageLedger.value = null
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
  &__flow-hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    line-height: 1.5;
  }

  /* Modal 内表单段间距（非壳层 surface 子节点） */
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

  &__copy-ledger {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-1);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
  }

  &__ledger-events {
    margin-top: var(--dp-space-block);

    h3 {
      margin: 0 0 var(--dp-space-component-tight);
      font-size: var(--dp-font-size-sm);
      font-weight: 600;
      color: var(--dp-text-primary);
    }

    ol {
      display: grid;
      gap: var(--dp-space-component-tight);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      align-items: center;
      gap: var(--dp-space-component);
      min-height: 32px;
      padding-bottom: var(--dp-space-component-tight);
      border-bottom: 1px solid var(--dp-border-subtle);
      color: var(--dp-text-secondary);
      font-size: var(--dp-font-size-sm);
    }
  }
}
</style>
