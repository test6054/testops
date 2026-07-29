<script setup lang="ts">
import type { PortfolioAiAnalysisDetailVO, PortfolioAiJobSummaryVO } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { portfolioAiOrchestrationApi } from '@/apis/portfolio/ai-orchestration'
import {
  PortfolioAiAnalysisTypeCode,
  PortfolioAiAnalysisTypeDescription,
  PortfolioMaterialTypeCode,
  PortfolioPolicyMatchConclusionDescription,
} from '@/apis/portfolio/enums'
import { portfolioMaterialApi } from '@/apis/portfolio/material'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { PORTFOLIO_POLICY_MATCH_CONCLUSION_TONE } from '@/apis/portfolio/types'
import { AiTaskStatusCode } from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioArchiveWriteGuardStrip from '@/components/portfolio/PortfolioArchiveWriteGuardStrip.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioAiTaskPolling } from '@/composables/usePortfolioAiTaskPolling'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { AiTaskStatusDescription } from '@/types/enums/ai-task-status-enum'
import { PortfolioAiTaskTypeDescription } from '@/types/enums/portfolio-ai-task-type-enum'
import {
  PortfolioPolicyCheckModeCode,
  PortfolioPolicyCheckModeDescription,
} from '@/types/enums/portfolio-policy-check-mode-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

type AnalysisPollOutcome
  = | AiTaskStatusCode.COMPLETED
    | AiTaskStatusCode.FAILED
    | AiTaskStatusCode.CANCELLED
    | 'TIMEOUT'
    | 'ABORTED'
    | 'CONTRACT_ERROR'

type MaterialRegisterOutcome
  = | { kind: 'ready', materialId: string, newlyRegistered: boolean }
    | { kind: 'aborted' }
    | { kind: 'failed', error: unknown }

const route = useRoute()
const { targetTeacherId, scopeReady } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const {
  archiveWriteForbidden,
  archiveWriteCapabilityUnknown,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  loading: archiveWriteGuardLoading,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard()
const { canPickTeachers, canManageTeacherAi } = usePortfolioTeacherAccess()

const activeTab = ref<'ask' | 'policy'>(
  readRouteStringParam(route.query.tab) === 'policy' ? 'policy' : 'ask',
)
const loading = ref(false)
const {
  polling,
  timedOutTaskId,
  pollStatusDescription,
  pollUntilSettled,
  invalidateOwner,
} = usePortfolioAiTaskPolling()
const selectedTeacherProgramId = ref<string>()
const registeredMaterialId = ref<string>()
const registeredMaterialFileNodeId = ref<string>()
const registeredMaterialType = ref<PortfolioMaterialTypeCode>()
const materialFileNodeId = ref<string>()
const materialFileName = ref<string>()
const materialType = ref<PortfolioMaterialTypeCode>(PortfolioMaterialTypeCode.DOCUMENT)
const analysisDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const materialTaskRows = ref<PortfolioAiJobSummaryVO[]>([])
const materialTaskLoading = ref(false)
const materialTaskPage = ref(1)
const materialTaskPageSize = ref(10)
const materialTaskTotal = ref(0)
const orchestrationToken = ref(0)

const askForm = reactive({
  userQuestion: '',
})

const policyForm = reactive({
  policyClauseText: '',
  teacherProfileSummary: '',
  attachMaterial: true,
})

const canOperate = computed(() =>
  Boolean(targetTeacherId.value && canManageTeacherAi(targetTeacherId.value)),
)

const analysisTypeLabel = computed(() =>
  analysisDetail.value
    ? strictEnumLabel(
        PortfolioAiAnalysisTypeDescription,
        analysisDetail.value.analysisType,
        '智能分析类型',
      )
    : '',
)

const policyConclusionLabel = computed(() => {
  const code = analysisDetail.value?.conclusionCode
  if (!code) {
    return ''
  }
  return strictEnumLabel(PortfolioPolicyMatchConclusionDescription, code, '政策匹配结论')
})

const policyConclusionTone = computed<BadgeTone>(() => {
  const code = analysisDetail.value?.conclusionCode
  if (!code) {
    return 'gray'
  }
  return strictEnumTone(PORTFOLIO_POLICY_MATCH_CONCLUSION_TONE, code, '政策匹配结论')
})

const isInformalPolicyCheck = computed(() => {
  const detail = analysisDetail.value
  if (!detail || detail.analysisType !== PortfolioAiAnalysisTypeCode.POLICY_MATCH) {
    return false
  }
  const mode = detail.policyCheckMode
  if (!mode) {
    return true
  }
  return mode === PortfolioPolicyCheckModeCode.INFORMAL_FREE_TEXT
})

const policyCheckModeLabel = computed(() => {
  const mode = analysisDetail.value?.policyCheckMode
  if (!mode) {
    return PortfolioPolicyCheckModeDescription[PortfolioPolicyCheckModeCode.INFORMAL_FREE_TEXT]
  }
  return strictEnumLabel(PortfolioPolicyCheckModeDescription, mode, '政策核验模式')
})

/** 清空当前教师绑定的材料上下文，避免跨教师残留旧材料。 */
function resetMaterialContext() {
  registeredMaterialId.value = undefined
  registeredMaterialFileNodeId.value = undefined
  registeredMaterialType.value = undefined
  materialFileNodeId.value = undefined
  materialFileName.value = undefined
  materialType.value = PortfolioMaterialTypeCode.DOCUMENT
}

/** 清空当前页已展示的 AI 结果，避免深链失败后继续显示旧教师结果。 */
function resetAnalysisContext() {
  analysisDetail.value = null
}

/** 教师范围切换后重置本页上下文，确保材料、专业、结果都回到当前教师。 */
function resetTeacherScopeContext() {
  orchestrationToken.value += 1
  invalidateOwner()
  loading.value = false
  selectedTeacherProgramId.value = undefined
  resetMaterialContext()
  resetAnalysisContext()
  materialTaskRows.value = []
  materialTaskTotal.value = 0
  materialTaskPage.value = 1
  askForm.userQuestion = ''
  policyForm.policyClauseText = ''
  policyForm.teacherProfileSummary = ''
  policyForm.attachMaterial = true
}

/** 分页读取当前教师的材料 AI 任务，供失败追踪和异步结果回看。 */
async function loadMaterialTasks() {
  if (!targetTeacherId.value) {
    materialTaskRows.value = []
    materialTaskTotal.value = 0
    return
  }
  const taskToken = orchestrationToken.value
  materialTaskLoading.value = true
  try {
    const page = await portfolioAiJobApi.page({
      teacherId: targetTeacherId.value,
      pageNum: materialTaskPage.value,
      pageSize: materialTaskPageSize.value,
    })
    if (orchestrationToken.value !== taskToken) return
    materialTaskRows.value = page.list
    materialTaskTotal.value = page.total
  } catch (error) {
    if (orchestrationToken.value !== taskToken) return
    materialTaskRows.value = []
    materialTaskTotal.value = 0
    showUserError(error, '加载材料智能分析任务失败')
  } finally {
    if (orchestrationToken.value === taskToken) materialTaskLoading.value = false
  }
}

function handleMaterialTaskPageChange(page: number, pageSize: number) {
  materialTaskPage.value = page
  materialTaskPageSize.value = pageSize
  void loadMaterialTasks()
}

function isAnalysisType(type: PortfolioAiAnalysisTypeCode) {
  return analysisDetail.value!.analysisType === type
}

const supportedOrchestrationAnalysis = computed(() => {
  const type = analysisDetail.value?.analysisType
  return (
    type === PortfolioAiAnalysisTypeCode.MATERIAL_QA
    || type === PortfolioAiAnalysisTypeCode.POLICY_MATCH
  )
})

async function loadTeacherProgram() {
  if (!targetTeacherId.value) {
    return
  }
  const requestToken = orchestrationToken.value
  try {
    const detail = await portfolioTeacherApi.get(targetTeacherId.value)
    if (orchestrationToken.value !== requestToken) {
      return
    }
    selectedTeacherProgramId.value = detail.programId
  } catch (error) {
    if (orchestrationToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载教师专业信息失败')
  }
}

async function loadRegisteredMaterial(materialId: string) {
  const requestToken = orchestrationToken.value
  try {
    const material = await portfolioMaterialApi.get(materialId)
    if (orchestrationToken.value !== requestToken) {
      return
    }
    if (!targetTeacherId.value) {
      resetMaterialContext()
      showFormValidationMessage('请先选择教师')
      return
    }
    if (material.teacherId !== targetTeacherId.value) {
      resetMaterialContext()
      resetAnalysisContext()
      void message.error('材料所属教师与当前页教师不一致')
      return
    }
    if (!material.fileNodeId) {
      resetMaterialContext()
      void message.error('材料未关联文件')
      return
    }
    registeredMaterialId.value = material.id
    registeredMaterialFileNodeId.value = material.fileNodeId
    registeredMaterialType.value = material.materialType
    materialFileNodeId.value = material.fileNodeId
    materialFileName.value = material.materialTitle ?? material.fileNodeId
    materialType.value = material.materialType
  } catch (error) {
    if (orchestrationToken.value !== requestToken) {
      return
    }
    resetMaterialContext()
    showUserError(error, '加载材料失败')
  }
}

async function ensureMaterialRegistered(taskToken: number): Promise<MaterialRegisterOutcome> {
  if (
    registeredMaterialId.value
    && registeredMaterialFileNodeId.value === materialFileNodeId.value
    && registeredMaterialType.value === materialType.value
  ) {
    return {
      kind: 'ready',
      materialId: registeredMaterialId.value,
      newlyRegistered: false,
    }
  }
  if (!targetTeacherId.value || !materialFileNodeId.value) {
    showFormValidationMessage('请先选择教师并上传材料文件')
    return { kind: 'aborted' }
  }
  const materialTitle = materialFileName.value?.trim() || '智能编排材料'
  const teacherId = targetTeacherId.value
  const fileNodeId = materialFileNodeId.value
  const currentMaterialType = materialType.value
  try {
    const materialId = await portfolioMaterialApi.save({
      teacherId,
      materialType: currentMaterialType,
      materialTitle,
      fileNodeId,
    })
    if (orchestrationToken.value !== taskToken || targetTeacherId.value !== teacherId) {
      return { kind: 'aborted' }
    }
    registeredMaterialId.value = materialId
    registeredMaterialFileNodeId.value = fileNodeId
    registeredMaterialType.value = currentMaterialType
    return { kind: 'ready', materialId, newlyRegistered: true }
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return { kind: 'aborted' }
    }
    return { kind: 'failed', error }
  }
}

function applyOrchestrationAnalysisDetail(detail: PortfolioAiAnalysisDetailVO): boolean {
  if (detail.analysisType === PortfolioAiAnalysisTypeCode.POLICY_MATCH) {
    activeTab.value = 'policy'
  } else if (detail.analysisType === PortfolioAiAnalysisTypeCode.MATERIAL_QA) {
    activeTab.value = 'ask'
  } else {
    showFormValidationMessage('该智能任务不属于智能问数或政策核验')
    return false
  }
  analysisDetail.value = detail
  if (detail.fileNodeId) {
    materialFileNodeId.value = detail.fileNodeId
  }
  return true
}

/** 轮询智能任务并返回受控终态，调用方只能在结果成功落地后提示完成。 */
async function pollAnalysis(
  taskId: string,
  taskToken = orchestrationToken.value,
): Promise<AnalysisPollOutcome> {
  const pollResult = await pollUntilSettled(
    taskId,
    () => orchestrationToken.value === taskToken,
  )
  if (pollResult.outcome === 'ABORTED') {
    return 'ABORTED'
  }
  if (pollResult.outcome === AiTaskStatusCode.COMPLETED) {
    if (orchestrationToken.value !== taskToken) {
      return 'ABORTED'
    }
    const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
    if (orchestrationToken.value !== taskToken) {
      return 'ABORTED'
    }
    return applyOrchestrationAnalysisDetail(detail)
      ? AiTaskStatusCode.COMPLETED
      : 'CONTRACT_ERROR'
  }
  if (
    pollResult.outcome === AiTaskStatusCode.FAILED
    || pollResult.outcome === AiTaskStatusCode.CANCELLED
  ) {
    if (orchestrationToken.value !== taskToken) {
      return 'ABORTED'
    }
    showUserError(null, '智能任务失败，请在任务列表查看原因后重新提交')
    return pollResult.outcome
  }
  if (orchestrationToken.value !== taskToken) {
    return 'ABORTED'
  }
  void message.info('智能任务仍在后台执行，可从任务中心查看或继续同步')
  return 'TIMEOUT'
}

/** 超时后继续同步同一任务，不重新提交。 */
async function continueTimedOutAiSync() {
  const taskId = timedOutTaskId.value
  if (!taskId || loading.value || polling.value) {
    return
  }
  loading.value = true
  const taskToken = orchestrationToken.value
  try {
    const outcome = await pollAnalysis(taskId, taskToken)
    if (orchestrationToken.value !== taskToken) {
      return
    }
    if (outcome === AiTaskStatusCode.COMPLETED) {
      void message.success('智能任务结果已同步')
      void loadMaterialTasks()
    }
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(error, '继续同步智能任务失败')
  } finally {
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
  }
}

async function submitAsk() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('提交 AI 问答'))) {
    return
  }

  if (!canOperate.value) {
    void message.error('无权为该教师提交智能问数')
    return
  }
  if (!askForm.userQuestion.trim()) {
    showFormValidationMessage('请输入问题')
    return
  }
  if (!materialFileNodeId.value) {
    showFormValidationMessage('请上传或选择材料文件')
    return
  }
  if (!selectedTeacherProgramId.value) {
    showFormValidationMessage('当前教师未关联专业')
    return
  }
  loading.value = true
  const taskToken = orchestrationToken.value
  resetAnalysisContext()
  const registerOutcome = await ensureMaterialRegistered(taskToken)
  if (registerOutcome.kind === 'aborted') {
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
    return
  }
  if (registerOutcome.kind === 'failed') {
    showUserError(registerOutcome.error, '材料登记失败')
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
    return
  }
  if (registerOutcome.newlyRegistered) {
    void message.success(`材料已登记 #${registerOutcome.materialId}，可复用于后续任务`)
  }
  try {
    const submitResult = await portfolioAiOrchestrationApi.ask({
      teacherId: targetTeacherId.value!,
      materialId: registerOutcome.materialId,
      fileNodeId: materialFileNodeId.value,
      materialType: materialType.value,
      userQuestion: askForm.userQuestion.trim(),
      programId: selectedTeacherProgramId.value,
    })
    if (orchestrationToken.value !== taskToken) {
      return
    }
    void message.info('问数任务已提交，正在等待结果…')
    const outcome = await pollAnalysis(submitResult.taskId, taskToken)
    if (orchestrationToken.value !== taskToken) {
      return
    }
    if (outcome === AiTaskStatusCode.COMPLETED) {
      void message.success('问数完成')
    }
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(
      error,
      `材料已登记 #${registerOutcome.materialId}，智能问数任务提交失败；可复用该材料重新提交任务`,
    )
  } finally {
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
  }
}

async function submitPolicyCheck() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('提交政策核验'))) {
    return
  }

  if (!canOperate.value) {
    void message.error('无权为该教师提交政策核验')
    return
  }
  if (!policyForm.policyClauseText.trim()) {
    showFormValidationMessage('请输入政策条款文本')
    return
  }
  if (policyForm.attachMaterial && !materialFileNodeId.value) {
    showFormValidationMessage('请上传或选择佐证材料')
    return
  }
  if (!selectedTeacherProgramId.value) {
    showFormValidationMessage('当前教师未关联专业')
    return
  }
  loading.value = true
  const taskToken = orchestrationToken.value
  resetAnalysisContext()
  let materialId: string | undefined
  let fileNodeId: string | undefined
  if (policyForm.attachMaterial && materialFileNodeId.value) {
    const registerOutcome = await ensureMaterialRegistered(taskToken)
    if (registerOutcome.kind === 'aborted') {
      if (orchestrationToken.value === taskToken) {
        loading.value = false
      }
      return
    }
    if (registerOutcome.kind === 'failed') {
      showUserError(registerOutcome.error, '材料登记失败')
      if (orchestrationToken.value === taskToken) {
        loading.value = false
      }
      return
    }
    if (registerOutcome.newlyRegistered) {
      void message.success(`材料已登记 #${registerOutcome.materialId}，可复用于后续任务`)
    }
    materialId = registerOutcome.materialId
    fileNodeId = materialFileNodeId.value
  }
  try {
    const submitResult = await portfolioAiOrchestrationApi.policyCheck({
      teacherId: targetTeacherId.value!,
      policyClauseText: policyForm.policyClauseText.trim(),
      materialType: materialType.value,
      materialId,
      fileNodeId,
      teacherProfileSummary: policyForm.teacherProfileSummary.trim() || undefined,
      programId: selectedTeacherProgramId.value,
    })
    if (orchestrationToken.value !== taskToken) {
      return
    }
    void message.info('政策核验任务已提交，正在等待结果…')
    const outcome = await pollAnalysis(submitResult.taskId, taskToken)
    if (orchestrationToken.value !== taskToken) {
      return
    }
    if (outcome === AiTaskStatusCode.COMPLETED) {
      void message.success('政策核验完成')
    }
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(
      error,
      materialId
        ? `材料已登记 #${materialId}，政策核验任务提交失败；可复用该材料重新提交任务`
        : '提交政策核验失败',
    )
  } finally {
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
  }
}

watch(
  () => route.query.materialId,
  (value) => {
    const materialId = readRouteStringParam(value)
    if (!scopeReady.value) {
      return
    }
    if (!materialId) {
      resetMaterialContext()
      return
    }
    void loadRegisteredMaterial(materialId)
  },
  { immediate: true },
)

watch(
  () => ({ ready: scopeReady.value, taskId: readRouteStringParam(route.query.taskId) }),
  (routeState) => {
    if (!routeState.ready) {
      return
    }
    if (!routeState.taskId) {
      orchestrationToken.value += 1
      resetAnalysisContext()
      return
    }
    orchestrationToken.value += 1
    resetAnalysisContext()
    const taskToken = orchestrationToken.value
    void pollAnalysis(routeState.taskId, taskToken).catch((error) => {
      if (orchestrationToken.value !== taskToken) {
        return
      }
      showUserError(error, '加载智能分析结果失败')
    })
  },
  { immediate: true },
)

watch(
  () => targetTeacherId.value,
  (teacherId, previousTeacherId) => {
    if (teacherId === previousTeacherId) {
      return
    }
    resetTeacherScopeContext()
  },
)

usePortfolioScopedLoader(
  () => {
    void Promise.all([loadTeacherProgram(), loadMaterialTasks()])
    const materialId = readRouteStringParam(route.query.materialId)
    if (materialId) {
      void loadRegisteredMaterial(materialId)
    }
  },
  () => targetTeacherId.value,
)

const AiOrchestrationSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'tasks',
      label: '材料任务',
      value: materialTaskRows.value.length,
      clickable: true,
      helper: '当前已加载',
    },
  ], { primaryKey: 'tasks', actionLabel: '刷新' })
})

function onAiOrchestrationSignalClick(_key: string) {
  void loadMaterialTasks()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="智能问数与政策核验"
        :subtitle="`${materialTaskRows.length} 条材料任务`"
      />
    </template>
    <template v-if="AiOrchestrationSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="AiOrchestrationSignalMetrics"
        @metric-click="onAiOrchestrationSignalClick"
      />
    </template>
    <PortfolioArchiveWriteGuardStrip
      :blocked="archiveWriteForbidden"
      :capability-unknown="archiveWriteCapabilityUnknown"
      :message="archiveWriteBlockMessage"
      :loading="archiveWriteGuardLoading"
      @confirm="() => void reloadLifecycleState()"
    />
    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <UiAlertStrip
        v-if="polling && pollStatusDescription"
        dense
        tone="info"
        title="智能任务同步中"
        :description="pollStatusDescription"
        class="dp-mb-component"
      />
      <UiAlertStrip
        v-else-if="timedOutTaskId"
        dense
        tone="warning"
        title="任务仍在后台执行"
        :description="pollStatusDescription"
        class="dp-mb-component"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="outline"
            :loading="loading || polling"
            @click="continueTimedOutAiSync"
          >
            继续同步
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiCard title="材料上下文">
        <UiSelect
          size="sm"
          v-model="materialType"
          class="ai-orchestration__field"
          :disabled="loading || polling"
          :options="[
            { value: PortfolioMaterialTypeCode.DOCUMENT, label: '文档' },
            { value: 'CERTIFICATE', label: '证书' },
          ]"
        />
        <UiPlatformFileField
          v-model:file-node-id="materialFileNodeId"
          v-model:file-name="materialFileName"
          :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
          label="材料文件"
          :disabled="loading || polling"
        />
        <p v-if="registeredMaterialId" class="ai-orchestration__hint">
          已绑定材料库记录 #{{ registeredMaterialId }}
          <template v-if="materialFileName">（{{ materialFileName }}）</template>
          ；任务失败时可直接复用，不会重复登记同一文件
        </p>
      </UiCard>

      <UiCard title="材料智能任务">
        <div class="ai-orchestration__task-toolbar">
          <UiButton
            size="sm"
            variant="outline"
            :loading="materialTaskLoading"
            @click="loadMaterialTasks"
          >
            刷新任务
          </UiButton>
        </div>
        <UiSpin :spinning="materialTaskLoading">
          <UiEmpty
            size="sm"
            v-if="!materialTaskLoading && materialTaskRows.length === 0"
            description="暂无材料智能任务"
          />
          <ul v-else class="ai-orchestration__task-list">
            <li v-for="task in materialTaskRows" :key="task.id">
              <div>
                <strong>{{ PortfolioAiTaskTypeDescription[task.taskType] }}</strong>
                <span class="ai-orchestration__meta">{{ task.createTime || '时间未记录' }}</span>
              </div>
              <UiTag
                :tone="
                  task.status === AiTaskStatusCode.COMPLETED
                    ? 'green'
                    : task.status === AiTaskStatusCode.FAILED
                      ? 'red'
                      : 'blue'
                "
              >
                {{ AiTaskStatusDescription[task.status] }}
              </UiTag>
              <p v-if="task.failureReason" class="ai-orchestration__task-failure">
                {{ task.failureReason }}
              </p>
            </li>
          </ul>
          <UiPagination
            v-if="materialTaskTotal > materialTaskPageSize"
            v-model:current="materialTaskPage"
            v-model:page-size="materialTaskPageSize"
            :total="materialTaskTotal"
            :show-size-changer="false"
            size="small"
            @change="handleMaterialTaskPageChange"
          />
        </UiSpin>
      </UiCard>

      <UiCard title="任务类型">
        <div class="ai-orchestration__tabs">
          <UiButton
            size="sm"
            :variant="activeTab === 'ask' ? 'primary' : 'outline'"
            :disabled="loading || polling"
            @click="activeTab = 'ask'"
          >
            材料智能问数
          </UiButton>
          <UiButton
            size="sm"
            :variant="activeTab === 'policy' ? 'primary' : 'outline'"
            :disabled="loading || polling"
            @click="activeTab = 'policy'"
          >
            政策专项核验
          </UiButton>
        </div>
      </UiCard>

      <UiCard v-if="activeTab === 'ask'" title="智能问数">
        <UiTextarea
          size="sm"
          v-model="askForm.userQuestion"
          class="ai-orchestration__field"
          :rows="4"
          :disabled="loading || polling"
          placeholder="基于材料内容提问，例如：该教师近一年有哪些省级以上荣誉？"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="loading || polling"
          :disabled="!canOperate || loading || polling"
          @click="() => void submitAsk()"
        >
          提交问数
        </UiButton>
      </UiCard>

      <UiCard v-else title="政策专项核验（临时自由文本）">
        <UiAlertStrip
          dense
          tone="warning"
          title="临时分析，不构成正式认定"
          description="当前仅支持粘贴条款全文做 AI 辅助核验；结果非正式人事/资格结论。正式核验须绑定已发布政策库条款。"
          class="dp-mb-component"
        />
        <UiTextarea
          size="sm"
          v-model="policyForm.policyClauseText"
          class="ai-orchestration__field"
          :rows="4"
          :disabled="loading || polling"
          placeholder="粘贴待核验的政策条款全文（非正式临时分析）"
        />
        <UiTextarea
          size="sm"
          v-model="policyForm.teacherProfileSummary"
          class="ai-orchestration__field"
          :rows="2"
          :disabled="loading || polling"
          placeholder="教师档案摘要（可选）"
        />
        <label class="ai-orchestration__checkbox">
          <input
            v-model="policyForm.attachMaterial"
            type="checkbox"
            :disabled="loading || polling"
          />
          附带材料文件作为佐证
        </label>
        <UiButton
          size="sm"
          variant="primary"
          :loading="loading || polling"
          :disabled="!canOperate || loading || polling"
          @click="() => void submitPolicyCheck()"
        >
          提交临时核验
        </UiButton>
      </UiCard>

      <UiCard v-if="analysisDetail" title="分析结果">
        <p class="ai-orchestration__title">
          {{ analysisDetail.resultTitle }}
        </p>
        <p class="ai-orchestration__meta">类型：{{ analysisTypeLabel }}</p>

        <template
          v-if="
            supportedOrchestrationAnalysis
              && isAnalysisType(PortfolioAiAnalysisTypeCode.MATERIAL_QA)
          "
        >
          <p v-if="analysisDetail.userQuestion" class="ai-orchestration__meta">
            用户问题：{{ analysisDetail.userQuestion }}
          </p>
          <pre class="ai-orchestration__summary">{{ analysisDetail.summary }}</pre>
          <section v-if="analysisDetail.evidenceItems.length" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">证据引用</h4>
            <ul class="ai-orchestration__list">
              <li v-for="(item, index) in analysisDetail.evidenceItems" :key="`ev-${index}`">
                <strong>{{ item.evidenceTitle }}</strong>
                <span v-if="item.evidenceSource">（{{ item.evidenceSource }}）</span>
                <p>{{ item.evidenceContent }}</p>
              </li>
            </ul>
          </section>
          <section v-if="analysisDetail.issueItems.length" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">提示</h4>
            <ul class="ai-orchestration__list">
              <li v-for="(item, index) in analysisDetail.issueItems" :key="`issue-${index}`">
                {{ item.issueTitle }}：{{ item.issueDescription }}
              </li>
            </ul>
          </section>
        </template>

        <template
          v-else-if="
            supportedOrchestrationAnalysis
              && isAnalysisType(PortfolioAiAnalysisTypeCode.POLICY_MATCH)
          "
        >
          <UiAlertStrip
            v-if="isInformalPolicyCheck"
            dense
            tone="warning"
            title="AI 辅助核验结果（非正式）"
            description="本结果基于自由文本临时分析，不能作为人事、职称或资格正式认定依据；须人工复核证据后再决策。"
            class="dp-mb-component"
          />
          <p class="ai-orchestration__meta">
            核验模式：{{ policyCheckModeLabel }}
            <template v-if="analysisDetail.modelName"> · 模型：{{ analysisDetail.modelName }}</template>
            <template v-if="analysisDetail.generatedTime || analysisDetail.createTime">
              · asOf：{{ analysisDetail.generatedTime || analysisDetail.createTime }}
            </template>
            <template v-if="analysisDetail.aiTaskId"> · 任务：#{{ analysisDetail.aiTaskId }}</template>
          </p>
          <p v-if="analysisDetail.conclusionCode" class="ai-orchestration__meta">
            AI 辅助判断：
            <UiTag :tone="policyConclusionTone">{{ policyConclusionLabel }}</UiTag>
          </p>
          <pre class="ai-orchestration__summary">{{ analysisDetail.summary }}</pre>
          <section v-if="analysisDetail.policyClauseDigest" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">政策条款摘要</h4>
            <pre class="ai-orchestration__summary">{{ analysisDetail.policyClauseDigest }}</pre>
          </section>
          <section v-if="analysisDetail.issueItems.length" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">需人工确认项</h4>
            <ul class="ai-orchestration__list">
              <li v-for="(item, index) in analysisDetail.issueItems" :key="`gap-${index}`">
                {{ item.issueTitle }}：{{ item.issueDescription }}
              </li>
            </ul>
          </section>
          <section v-if="analysisDetail.suggestionItems.length" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">补采建议</h4>
            <ul class="ai-orchestration__list">
              <li v-for="(item, index) in analysisDetail.suggestionItems" :key="`sug-${index}`">
                {{ item.suggestionTitle }}：{{ item.suggestionContent }}
              </li>
            </ul>
          </section>
          <section v-if="analysisDetail.evidenceItems.length" class="ai-orchestration__section">
            <h4 class="ai-orchestration__section-title">依据引用</h4>
            <ul class="ai-orchestration__list">
              <li v-for="(item, index) in analysisDetail.evidenceItems" :key="`pref-${index}`">
                {{ item.evidenceContent }}
              </li>
            </ul>
          </section>
        </template>

        <UiEmpty
          v-else
          size="sm"
          title="分析结果类型异常"
          description="当前页面仅支持材料问数与政策核验结果展示"
        />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.ai-orchestration__field {
  display: block;
  width: 100%;
  max-width: 640px;
  margin-bottom: var(--dp-space-component);
}
.ai-orchestration__tabs {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.ai-orchestration__hint {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.ai-orchestration__task-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--dp-space-component-tight);
}
.ai-orchestration__task-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--dp-space-component);
}
.ai-orchestration__task-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--dp-space-component-tight) var(--dp-space-component);
  padding: var(--dp-space-component) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}
.ai-orchestration__task-failure {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--dp-danger);
}
.ai-orchestration__checkbox {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
  font-size: var(--dp-font-size-md);
}
.ai-orchestration__title {
  margin: 0 0 var(--dp-space-component-tight);
  font-weight: 600;
}
.ai-orchestration__meta {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.ai-orchestration__summary {
  margin: 0 0 var(--dp-space-component);
  padding: var(--dp-space-component);
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--dp-fill-quaternary);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
.ai-orchestration__section {
  margin-top: var(--dp-space-component);
}
.ai-orchestration__section-title {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.ai-orchestration__list {
  margin: 0;
  padding-left: 18px;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
.ai-orchestration__list li + li {
  margin-top: var(--dp-space-component-tight);
}
</style>
