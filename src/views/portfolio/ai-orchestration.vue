<script setup lang="ts">
import type { PortfolioAiAnalysisDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const { targetTeacherId, scopeReady } = usePortfolioPageScope()
const { canManageTeacherAi } = usePortfolioTeacherAccess()

const activeTab = ref<'ask' | 'policy'>(
  readRouteStringParam(route.query.tab) === 'policy' ? 'policy' : 'ask',
)
const loading = ref(false)
const polling = ref(false)
const selectedTeacherProgramId = ref<string>()
const registeredMaterialId = ref<string>()
const materialFileNodeId = ref<string>()
const materialFileName = ref<string>()
const materialType = ref<PortfolioMaterialTypeCode>(PortfolioMaterialTypeCode.DOCUMENT)
const analysisDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const teacherOptions = ref<PortfolioTeacherSummaryVO[]>([])
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
        'AI 分析类型',
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

/** 清空当前教师绑定的材料上下文，避免跨教师残留旧材料。 */
function resetMaterialContext() {
  registeredMaterialId.value = undefined
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
  selectedTeacherProgramId.value = undefined
  resetMaterialContext()
  resetAnalysisContext()
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
    })
    if (orchestrationToken.value !== requestToken) {
      return
    }
    teacherOptions.value = page.list
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
      message.error('请先选择教师')
      return
    }
    if (material.teacherId !== targetTeacherId.value) {
      resetMaterialContext()
      resetAnalysisContext()
      message.error('材料所属教师与当前页教师不一致')
      return
    }
    if (!material.fileNodeId) {
      resetMaterialContext()
      message.error('材料未关联文件')
      return
    }
    registeredMaterialId.value = material.id
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

async function ensureMaterialRegistered(): Promise<string | null> {
  if (registeredMaterialId.value) {
    return registeredMaterialId.value
  }
  if (!targetTeacherId.value || !materialFileNodeId.value) {
    showUserError(null, '请先选择教师并上传材料文件')
    return null
  }
  const materialTitle = materialFileName.value?.trim() || 'AI编排材料'
  const materialId = await portfolioMaterialApi.save({
    teacherId: targetTeacherId.value,
    materialType: materialType.value,
    materialTitle,
    fileNodeId: materialFileNodeId.value,
  })
  registeredMaterialId.value = materialId
  return materialId
}

function applyOrchestrationAnalysisDetail(detail: PortfolioAiAnalysisDetailVO) {
  if (detail.analysisType === PortfolioAiAnalysisTypeCode.POLICY_MATCH) {
    activeTab.value = 'policy'
  } else if (detail.analysisType === PortfolioAiAnalysisTypeCode.MATERIAL_QA) {
    activeTab.value = 'ask'
  } else {
    showUserError(null, '该 AI 任务不属于智能问数或政策核验')
    return
  }
  analysisDetail.value = detail
  if (detail.fileNodeId) {
    materialFileNodeId.value = detail.fileNodeId
  }
}

async function pollAnalysis(taskId: string, taskToken = orchestrationToken.value) {
  polling.value = true
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (orchestrationToken.value !== taskToken) {
        return
      }
      const task = await portfolioAiJobApi.get(taskId)
      if (orchestrationToken.value !== taskToken) {
        return
      }
      if (task.status === 'SUCCEEDED') {
        const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
        if (orchestrationToken.value !== taskToken) {
          return
        }
        applyOrchestrationAnalysisDetail(detail)
        return
      }
      if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
        if (orchestrationToken.value !== taskToken) {
          return
        }
        showUserError(null, 'AI 任务失败，请在任务列表查看原因后重新提交')
        return
      }
      await sleep(2000)
    }
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(null, 'AI 任务超时，请在任务列表查看结果')
  } finally {
    if (orchestrationToken.value === taskToken) {
      polling.value = false
    }
  }
}

async function submitAsk() {
  if (!canOperate.value) {
    message.error('无权为该教师提交智能问数')
    return
  }
  if (!askForm.userQuestion.trim()) {
    message.warning('请输入问题')
    return
  }
  if (!materialFileNodeId.value) {
    message.warning('请上传或选择材料文件')
    return
  }
  if (!selectedTeacherProgramId.value) {
    message.warning('当前教师未关联专业')
    return
  }
  loading.value = true
  const taskToken = orchestrationToken.value
  resetAnalysisContext()
  try {
    const materialId = await ensureMaterialRegistered()
    if (!materialId) {
      return
    }
    const submitResult = await portfolioAiOrchestrationApi.ask({
      teacherId: targetTeacherId.value!,
      materialId,
      fileNodeId: materialFileNodeId.value,
      materialType: materialType.value,
      userQuestion: askForm.userQuestion.trim(),
      programId: selectedTeacherProgramId.value,
    })
    if (orchestrationToken.value !== taskToken) {
      return
    }
    message.info('问数任务已提交，正在等待结果…')
    await pollAnalysis(submitResult.taskId, taskToken)
    if (orchestrationToken.value !== taskToken) {
      return
    }
    message.success('问数完成')
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(error, '提交智能问数失败')
  } finally {
    if (orchestrationToken.value === taskToken) {
      loading.value = false
    }
  }
}

async function submitPolicyCheck() {
  if (!canOperate.value) {
    message.error('无权为该教师提交政策核验')
    return
  }
  if (!policyForm.policyClauseText.trim()) {
    message.warning('请输入政策条款文本')
    return
  }
  if (policyForm.attachMaterial && !materialFileNodeId.value) {
    message.warning('请上传或选择佐证材料')
    return
  }
  if (!selectedTeacherProgramId.value) {
    message.warning('当前教师未关联专业')
    return
  }
  loading.value = true
  const taskToken = orchestrationToken.value
  resetAnalysisContext()
  try {
    let materialId: string | undefined
    let fileNodeId: string | undefined
    if (policyForm.attachMaterial && materialFileNodeId.value) {
      const registeredMaterialId = await ensureMaterialRegistered()
      if (!registeredMaterialId) {
        return
      }
      materialId = registeredMaterialId
      fileNodeId = materialFileNodeId.value
    }
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
    message.info('政策核验任务已提交，正在等待结果…')
    await pollAnalysis(submitResult.taskId, taskToken)
    if (orchestrationToken.value !== taskToken) {
      return
    }
    message.success('政策核验完成')
  } catch (error) {
    if (orchestrationToken.value !== taskToken) {
      return
    }
    showUserError(error, '提交政策核验失败')
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
      showUserError(error, '加载 AI 分析结果失败')
    })
  },
  { immediate: true },
)

watch(
  () => targetTeacherId.value,
  (teacherId, previousTeacherId) => {
    if (!teacherId || teacherId === previousTeacherId) {
      return
    }
    resetTeacherScopeContext()
  },
)

usePortfolioScopedLoader(
  () => {
    void loadTeacherProgram()
    const materialId = readRouteStringParam(route.query.materialId)
    if (materialId) {
      void loadRegisteredMaterial(materialId)
    }
  },
  () => targetTeacherId.value,
)

onMounted(() => {
  if (scopeReady.value) {
    void loadTeacherProgram()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      title="AI 智能问数与政策核验"
      description="材料须先登记材料库，再提交 ask / policy-check 编排任务"
    />
    <UiCard title="材料上下文">
      <a-select
        v-model:value="materialType"
        class="ai-orchestration__field"
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
      />
      <p v-if="registeredMaterialId" class="ai-orchestration__hint">
        已绑定材料库记录 #{{ registeredMaterialId }}
      </p>
    </UiCard>

    <UiCard title="任务类型">
      <div class="ai-orchestration__tabs">
        <UiButton :variant="activeTab === 'ask' ? 'primary' : 'outline'" @click="activeTab = 'ask'">
          材料智能问数
        </UiButton>
        <UiButton
          :variant="activeTab === 'policy' ? 'primary' : 'outline'"
          @click="activeTab = 'policy'"
        >
          政策专项核验
        </UiButton>
      </div>
    </UiCard>

    <UiCard v-if="activeTab === 'ask'" title="智能问数">
      <a-textarea
        v-model:value="askForm.userQuestion"
        class="ai-orchestration__field"
        :rows="4"
        placeholder="基于材料内容提问，例如：该教师近一年有哪些省级以上荣誉？"
      />
      <UiButton variant="primary" :loading="loading || polling" @click="() => void submitAsk()">
        提交问数
      </UiButton>
    </UiCard>

    <UiCard v-else title="政策专项核验">
      <a-textarea
        v-model:value="policyForm.policyClauseText"
        class="ai-orchestration__field"
        :rows="4"
        placeholder="粘贴待核验的政策条款全文"
      />
      <a-textarea
        v-model:value="policyForm.teacherProfileSummary"
        class="ai-orchestration__field"
        :rows="2"
        placeholder="教师档案摘要（可选）"
      />
      <label class="ai-orchestration__checkbox">
        <input v-model="policyForm.attachMaterial" type="checkbox" />
        附带材料文件作为佐证
      </label>
      <UiButton
        variant="primary"
        :loading="loading || polling"
        @click="() => void submitPolicyCheck()"
      >
        提交核验
      </UiButton>
    </UiCard>

    <UiCard v-if="analysisDetail" title="分析结果">
      <p class="ai-orchestration__title">
        {{ analysisDetail.resultTitle }}
      </p>
      <p class="ai-orchestration__meta">类型：{{ analysisTypeLabel }}</p>

      <template
        v-if="
          supportedOrchestrationAnalysis && isAnalysisType(PortfolioAiAnalysisTypeCode.MATERIAL_QA)
        "
      >
        <p v-if="analysisDetail.reportScene" class="ai-orchestration__meta">
          用户问题：{{ analysisDetail.reportScene }}
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
          supportedOrchestrationAnalysis && isAnalysisType(PortfolioAiAnalysisTypeCode.POLICY_MATCH)
        "
      >
        <p v-if="analysisDetail.conclusionCode" class="ai-orchestration__meta">
          结论：
          <UiTag :tone="policyConclusionTone">{{ policyConclusionLabel }}</UiTag>
        </p>
        <pre class="ai-orchestration__summary">{{ analysisDetail.summary }}</pre>
        <section v-if="analysisDetail.policyClauseDigest" class="ai-orchestration__section">
          <h4 class="ai-orchestration__section-title">政策条款摘要</h4>
          <pre class="ai-orchestration__summary">{{ analysisDetail.policyClauseDigest }}</pre>
        </section>
        <section v-if="analysisDetail.issueItems.length" class="ai-orchestration__section">
          <h4 class="ai-orchestration__section-title">缺口项</h4>
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

      <a-result
        v-else
        status="error"
        title="分析结果类型异常"
        sub-title="当前页面仅支持材料问数与政策核验结果展示"
      />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.ai-orchestration__field {
  display: block;
  width: 100%;
  max-width: 640px;
  margin-bottom: 12px;
}
.ai-orchestration__tabs {
  display: flex;
  gap: 8px;
}
.ai-orchestration__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.ai-orchestration__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}
.ai-orchestration__title {
  margin: 0 0 8px;
  font-weight: 600;
}
.ai-orchestration__meta {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.ai-orchestration__summary {
  margin: 0 0 12px;
  padding: 12px;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.ai-orchestration__section {
  margin-top: 12px;
}
.ai-orchestration__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.ai-orchestration__list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.6;
}
.ai-orchestration__list li + li {
  margin-top: 8px;
}
</style>
