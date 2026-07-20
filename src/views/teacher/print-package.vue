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
            :title="generateDisabledReason"
          >
            <UiButton
              variant="primary"
              size="sm"
              :loading="generating"
              :disabled="generateBlocked"
              @click="openGenerateModal"
            >
              <template #icon><ThunderboltOutlined /></template>
              一键生成印刷包
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

    <template v-if="selectedExamId && printPackageApplicable" #signal>
      <SignalBand compact variant="panel" :metrics="packageSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="print-package-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiEmpty
        size="sm"
        v-if="!printPackageApplicable"
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

        <!-- 一键生成印刷包 -->
        <UiDrawer
          v-model:open="generateModalVisible"
          title="一键生成印刷包"
          :width="560"
          :hide-footer="false"
          ok-text="开始生成"
          cancel-text="取消"
          :confirm-loading="generating"
          @ok="handleGenerate"
        >
          <UiForm layout="vertical" style="margin-top: 8px">
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
                <UiTag :tone="record.status === 'PRINTED' ? 'green' : 'gray'" size="sm">
                  {{ record.status === 'PRINTED' ? '已印刷' : '待印刷' }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </UiDrawer>

        <!-- PDF 预览 -->
        <UiDrawer
          v-model:open="previewModalOpen"
          title="印刷包便携文档预览"
          :width="900"
          hide-footer
        >
          <UiSkeletonState v-if="previewLoading" variant="card" compact />
          <iframe
            v-else-if="previewPdfUrl"
            :src="previewPdfUrl"
            class="print-package__preview-frame"
          />
          <UiEmpty size="sm" v-else description="暂无印制包预览" />
        </UiDrawer>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamWorkbenchPrintPackagePanelResponse } from '@/apis/mark/exam-progress'
import type { ExamPrintPackageResponse, PrintPackageItemVO } from '@/apis/mark/print-package'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile, getFileArrayBuffer } from '@/apis/edu/file-management'
import {
  ExamMaterialLayoutModeCode,
  ExamPrintSourceModeCode,
  getExamDetail,
} from '@/apis/mark/exam'
import { getPrintPackagePanel } from '@/apis/mark/exam-progress'
import {
  generatePrintPackage,
  isLayoutNotReadyError,
  pagePrintPackageItems,
  pagePrintPackages,
  PRINT_PACKAGE_ANSWER_SHEET_HINT,
  PRINT_PACKAGE_EXTERNAL_PRINT_HINT,
  PRINT_PACKAGE_FLOW_HINT,
  PRINT_PACKAGE_STATUS_TONE,
  PrintPackageStatusDescription,
} from '@/apis/mark/print-package'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
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
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import { isPrintPackageMenuApplicable } from '@/utils/exam-print-package-applicable'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { resolvePrintPackageGenerateGate } from '@/utils/workflow-readiness/print-package-prep-readiness'

defineOptions({ name: 'TeacherPrintPackage' })

const router = useRouter()
const { selectedExamId, selectedExam } = useMarkExamContext()
const workbenchContext = useMarkWorkbenchContext()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('印刷包')
const { refreshSnapshot } = useWorkspaceExamId()

const prepBlockingReasons = computed(
  () => workbenchContext.snapshot.value?.prepBlockingReasons ?? [],
)
const examDetail = ref<Awaited<ReturnType<typeof getExamDetail>> | null>(null)

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
    prepBlockingReasons: prepBlockingReasons.value,
    backendPrepSteps: workbenchContext.snapshot.value?.prepSteps,
    prepStepCards: prepStepCards.value.length > 0 ? prepStepCards.value : undefined,
  })
})

const generateBlocked = computed(() => printPackageGenerateGate.value.generateBlocked)
const printPackagePrepWorkflowSteps = computed(() => printPackageGenerateGate.value.panelSteps)
const generateDisabledReason = computed(() => printPackageGenerateGate.value.disabledTooltip)

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
  if (detail.materialLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET) {
    return PRINT_PACKAGE_ANSWER_SHEET_HINT
  }
  if (detail.printSourceMode === ExamPrintSourceModeCode.EXTERNAL_PRINT) {
    return PRINT_PACKAGE_EXTERNAL_PRINT_HINT
  }
  return ''
})

const printPackageFlowHint = computed(
  () => examDetail.value?.prepScenarioGuide?.printGuidance ?? PRINT_PACKAGE_FLOW_HINT,
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
const packageList = ref<ExamPrintPackageResponse[]>([])
const printPackagePanel = ref<ExamWorkbenchPrintPackagePanelResponse | null>(null)
/** MVR-266/324：仅认 BE canManageOwnerPrintPackageWrites===true；禁止缺省回退 isExamOwner */
const canManageOwnerPrintPackageWrites = computed(
  () => printPackagePanel.value?.canManageOwnerPrintPackageWrites === true,
)
// 加载失败：toast 提示，主区保持空态/列表壳
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })

const packageSignalMetrics = computed((): SignalMetric[] => {
  const panel = printPackagePanel.value
  if (!panel) {
    return [{ key: 'packages', label: '印刷包', value: '—', tone: 'gray' }]
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
      label: '印刷人数',
      value: panel.totalItemCount,
      unit: '人',
      tone: 'green',
    },
    {
      key: 'candidates',
      label: '名册人数',
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

async function loadPrintPackagePanel(): Promise<void> {
  if (!selectedExamId.value) {
    printPackagePanel.value = null
    return
  }
  try {
    printPackagePanel.value = await getPrintPackagePanel(selectedExamId.value)
  } catch (error) {
    printPackagePanel.value = null
    showUserError(error, '印刷包看板加载失败')
  }
}

async function loadPackageList() {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const res = await pagePrintPackages({
      examId: selectedExamId.value,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    packageList.value = res.list
    pagination.pageNum = res.pageNum
    pagination.pageSize = res.pageSize
    pagination.total = res.total
  } catch (e) {
    packageList.value = []
    pagination.total = 0
    showUserError(e, '印刷包列表加载失败')
  } finally {
    loading.value = false
  }
}

function handlePackagePageChange(pageEvent: { current: number, pageSize: number }): void {
  pagination.pageNum = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  loadPackageList()
}

// ─── 状态展示 ───────────────────────────────────────────────────────

function statusTone(status: ExamPrintPackageResponse['status']): BadgeTone {
  return strictEnumTone(PRINT_PACKAGE_STATUS_TONE, status, '印刷包状态')
}

function statusLabel(status: ExamPrintPackageResponse['status']): string {
  return strictEnumLabel(PrintPackageStatusDescription, status, '印刷包状态')
}

// ─── 一键生成印刷包 ──────────────────────────────────────────────────

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
    message.warning(generateDisabledReason.value ?? '考试准备未完成，暂不可生成印刷包')
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
    message.success('印刷包生成成功')
    generateModalVisible.value = false
    pagination.pageNum = 1
    await Promise.all([loadPackageList(), loadPrintPackagePanel()])
    await refreshSnapshot()
  } catch (error) {
    if (error instanceof Error && isLayoutNotReadyError(error)) {
      showUserError(error, '请先完成制卷设计并生成可打印便携文档，再生成印刷包')
      return
    }
    showUserError(error, '印刷包生成失败，请确认考生名册已配置且制卷设计可打印便携文档已就绪')
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
const previewLoading = ref(false)
const previewPdfUrl = ref('')

async function previewPackagePdf(pkg: ExamPrintPackageResponse) {
  previewModalOpen.value = true
  previewLoading.value = true
  previewPdfUrl.value = ''
  try {
    const buffer = await getFileArrayBuffer({ nodeId: pkg.packageFileId })
    previewPdfUrl.value = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
  } catch (error) {
    showUserError(error, '印刷包预览加载失败')
  } finally {
    previewLoading.value = false
  }
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
  await loadDetailItems()
}

async function loadDetailItems(): Promise<void> {
  const pkg = detailPackage.value
  if (!pkg) return
  detailLoading.value = true
  try {
    const page = await pagePrintPackageItems({
      examId: pkg.examId,
      printPackageId: pkg.printPackageId,
      pageNum: detailPagination.pageNum,
      pageSize: detailPagination.pageSize,
    })
    detailItems.value = page.list
    detailPagination.total = page.total
    if (page.pageNum != null) {
      detailPagination.pageNum = page.pageNum
    }
    if (page.pageSize != null) {
      detailPagination.pageSize = page.pageSize
    }
  } catch (error) {
    detailItems.value = []
    detailPagination.total = 0
    showUserError(error, '印刷包明细加载失败')
  } finally {
    detailLoading.value = false
  }
}

function handleDetailPageChange(pageEvent: { current: number, pageSize: number }): void {
  detailPagination.pageNum = pageEvent.current
  detailPagination.pageSize = pageEvent.pageSize
  void loadDetailItems()
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

async function loadExamDetailForPrep(examId: string): Promise<void> {
  try {
    examDetail.value = await getExamDetail(examId)
  } catch (error) {
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  }
}

watch(
  [selectedExamId, printPackageApplicable],
  ([val, applicable]) => {
    pagination.pageNum = 1
    if (!val) {
      examDetail.value = null
      packageList.value = []
      printPackagePanel.value = null
      pagination.total = 0
      return
    }
    void loadExamDetailForPrep(val)
    if (applicable) {
      void Promise.all([loadPackageList(), loadPrintPackagePanel()])
    } else {
      packageList.value = []
      printPackagePanel.value = null
      pagination.total = 0
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.print-package-page {
  &__empty {
    margin-top: var(--dp-space-3, 12px);
  }

  &__blocking-strip {
    margin-bottom: var(--dp-space-4);
  }

  &__flow-hint {
    font-size: 12px;
    color: var(--dp-text-tertiary);
    line-height: 1.5;
  }

  &__scenario {
    margin-bottom: var(--dp-space-4);
  }

  &__list-card {
    margin-top: 8px;
  }

  &__preview-frame {
    min-height: 140px;
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-md);
    overflow: hidden;
  }
}
</style>
