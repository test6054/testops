<script setup lang="ts">
import type {
  PfImpactApprovalStatusCode,
  PortfolioImpactIndicatorSummaryDto,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioPublishImpactReportVO,
} from '@/apis/portfolio/indicator-types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  PF_CURRENT_TASK_RULE_STRATEGY_OPTIONS,
  PF_SCENE_CODE_OPTIONS,
  PfCurrentTaskRuleStrategyCode,
  pfImpactApprovalAllowsPublish,
  PfImpactApprovalStatusDescription,
  PfIndicatorBusinessReferenceSceneDescription,
  PfRuleChangeLevelCode,
  PfRuleChangeLevelDescription,
  pfRuleChangeLevelRequiresApproval,
  PfSceneCode,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStep from '@/components/ui-guide/ui/UiStep.vue'
import UiSteps from '@/components/ui-guide/ui/UiSteps.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const sceneCode = ref<PfSceneCode>(PfSceneCode.PERFORMANCE)
const academicYear = ref('2025-2026')
const step = ref(1)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const trialing = computed(() => operationKey.value === 'trial')
const previewing = computed(() => operationKey.value === 'impact')
const publishing = computed(() => operationKey.value === 'publish')
const enabling = computed(() => operationKey.value === 'enable-all')
const exporting = computed(() => operationKey.value === 'export-impact')
const impactReportId = ref('')
const trialPassed = ref(false)
const readiness = ref<PortfolioIndicatorEngineReadinessVO | null>(null)
const impactReport = ref<PortfolioPublishImpactReportVO | null>(null)
const impactSummary = ref<PortfolioImpactIndicatorSummaryDto | null>(null)
const currentTaskRuleStrategy = ref<PfCurrentTaskRuleStrategyCode>(
  PfCurrentTaskRuleStrategyCode.KEEP_CURRENT,
)
const readinessError = ref('')
const readinessRequestToken = ref(0)
const workflowSceneCode = ref<PfSceneCode | null>(null)

/** 发布向导各状态动作必须串行，确保试算、影响报告和发布使用同一业务上下文。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

function resetWorkflow() {
  trialPassed.value = false
  workflowSceneCode.value = null
  impactReportId.value = ''
  impactReport.value = null
  impactSummary.value = null
  currentTaskRuleStrategy.value = PfCurrentTaskRuleStrategyCode.KEEP_CURRENT
  step.value = 1
}

async function loadReadiness() {
  const currentToken = readinessRequestToken.value + 1
  readinessRequestToken.value = currentToken
  readinessError.value = ''
  try {
    const result = await portfolioIndicatorTenantApi.referenceStatus()
    if (readinessRequestToken.value !== currentToken) return
    readiness.value = result
  } catch (error) {
    if (readinessRequestToken.value !== currentToken) return
    readiness.value = null
    readinessError.value = '指标就绪状态加载失败，请刷新重试'
    showUserError(error, '加载指标就绪状态失败')
  }
}

async function enableAllIndicators() {
  const operation = 'enable-all'
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      title: '确认启用全部平台指标？',
      content: '将启用当前租户可用的 T001-T100 平台指标，后续仍需按场景试算并发布。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    const result = await portfolioIndicatorTenantApi.enableAllConfig()
    void message.success(`已启用 ${result.enabledCount} 项指标`)
    await loadReadiness()
  } catch (error) {
    showUserError(error, '启用全部指标失败')
  } finally {
    endOperation(operation)
  }
}

async function runTrial() {
  const targetSceneCode = sceneCode.value
  const operation = 'trial'
  if (!beginOperation(operation)) return
  resetWorkflow()
  try {
    const model = await portfolioIndicatorTenantApi.trialModel({ sceneCode: targetSceneCode })
    if (sceneCode.value !== targetSceneCode) return
    trialPassed.value = Boolean(model.trialPassed)
    if (!trialPassed.value) {
      void message.error('试算未通过，无法进入影响分析')
      return
    }
    workflowSceneCode.value = targetSceneCode
    step.value = 2
    void message.success('试算通过')
  } catch (error) {
    showUserError(error, '指标试算失败')
  } finally {
    endOperation(operation)
  }
}

function applyImpactSummary(report: PortfolioPublishImpactReportVO): boolean {
  const summary = report.indicatorSummary
  if (!summary) {
    impactSummary.value = null
    return false
  }
  impactSummary.value = summary
  return true
}

async function runImpactPreview() {
  if (!trialPassed.value || workflowSceneCode.value !== sceneCode.value) {
    showFormValidationMessage('请先对当前场景执行并通过试算')
    resetWorkflow()
    return
  }
  const targetSceneCode = sceneCode.value
  const operation = 'impact'
  if (!beginOperation(operation)) return
  try {
    const reportId = await portfolioIndicatorTenantApi.impactPreview({
      sceneCode: targetSceneCode,
    })
    const report = await portfolioIndicatorTenantApi.getImpactReport({
      id: reportId,
    })
    if (sceneCode.value !== targetSceneCode || workflowSceneCode.value !== targetSceneCode) return
    if (!applyImpactSummary(report)) {
      impactReportId.value = ''
      impactReport.value = null
      void message.error('影响分析摘要缺失，请重新生成影响分析')
      return
    }
    impactReportId.value = reportId
    impactReport.value = report
    step.value = 3
    void message.success('影响分析完成')
  } catch (error) {
    impactReportId.value = ''
    impactReport.value = null
    impactSummary.value = null
    showUserError(error, '生成影响分析失败')
  } finally {
    endOperation(operation)
  }
}

const requiresApproval = computed(() =>
  pfRuleChangeLevelRequiresApproval(impactReport.value?.changeLevel),
)
const canPublish = computed(
  () =>
    Boolean(impactReportId.value)
    && pfImpactApprovalAllowsPublish(impactReport.value?.approvalStatus),
)
const showTaskStrategy = computed(() => {
  const level = impactReport.value?.changeLevel
  return level === PfRuleChangeLevelCode.B
})

function changeLevelLabel(code?: PfRuleChangeLevelCode): string {
  if (!code) return '—'
  return strictEnumLabel(PfRuleChangeLevelDescription, code, '规则变更级别')
}

function approvalStatusLabel(code?: PfImpactApprovalStatusCode): string {
  if (!code) return '—'
  return strictEnumLabel(PfImpactApprovalStatusDescription, code, '影响分析审批状态')
}

async function publish() {
  const targetSceneCode = sceneCode.value
  const targetAcademicYear = academicYear.value.trim()
  const targetImpactReportId = impactReportId.value
  if (
    !trialPassed.value
    || workflowSceneCode.value !== targetSceneCode
    || !targetImpactReportId
    || !impactReport.value
  ) {
    showFormValidationMessage('当前场景尚未完成试算和影响分析')
    resetWorkflow()
    return
  }
  if (!pfImpactApprovalAllowsPublish(impactReport.value.approvalStatus)) {
    showFormValidationMessage(
      impactReport.value.changeLevel === PfRuleChangeLevelCode.A
      || impactReport.value.changeLevel === PfRuleChangeLevelCode.B
        ? 'A/B 级变更须先完成影响分析审批，方可发布'
        : '当前影响分析审批状态不允许发布',
    )
    return
  }
  if (
    impactReport.value.changeLevel === PfRuleChangeLevelCode.B
    && !currentTaskRuleStrategy.value
  ) {
    showFormValidationMessage('B 级变更须选择进行中任务规则策略')
    return
  }
  if (!/^\d{4}-\d{4}$/.test(targetAcademicYear)) {
    showFormValidationMessage('学年格式应为四位年起止年，中间用短横线连接')
    return
  }
  const operation = 'publish'
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      title: '确认发布指标模型？',
      content: `将按 ${targetAcademicYear} 发布当前场景模型并形成正式快照，请确认影响报告已审阅。`,
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIndicatorTenantApi.publishModel({
      sceneCode: targetSceneCode,
      impactReportId: targetImpactReportId,
      academicYear: targetAcademicYear,
      currentTaskRuleStrategy:
        impactReport.value?.changeLevel === PfRuleChangeLevelCode.B
          ? currentTaskRuleStrategy.value
          : PfCurrentTaskRuleStrategyCode.KEEP_CURRENT,
    })
    void message.success('发布成功')
    await router.push({ name: 'PortfolioIndicatorHistory' })
  } catch (error) {
    showUserError(error, '发布指标模型失败')
  } finally {
    endOperation(operation)
  }
}

async function exportImpact() {
  if (!impactReportId.value) {
    return
  }
  const reportId = impactReportId.value
  const operation = 'export-impact'
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({
      id: reportId,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    void message.success('影响报告已导出')
  } catch (error) {
    showUserError(error, '导出影响报告失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(loadReadiness)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="规则发布向导" />
    </template>
    <UiCard title="指标工程贯通">
      <p v-if="readinessError" class="readiness-error">{{ readinessError }}</p>
      <div v-if="readiness" class="readiness">
        <span>已启用 {{ readiness.enabledIndicatorCount }} /
          {{ readiness.platformIndicatorCount }}</span>
        <span
          v-for="scene in readiness.sceneStatuses"
          :key="scene.referenceScene"
          class="scene-tag"
        >
          {{
            strictEnumLabel(
              PfIndicatorBusinessReferenceSceneDescription,
              scene.referenceScene,
              '指标业务引用场景',
            )
          }}：{{ scene.referencedIndicatorCount }}
        </span>
      </div>
      <UiButton
        size="sm"
        variant="outline"
        :loading="enabling"
        :disabled="writing"
        @click="enableAllIndicators"
      >
        启用 T001–T100
      </UiButton>
    </UiCard>
    <UiCard>
      <UiSteps :current="step - 1" size="small" style="margin-bottom: 16px">
        <UiStep title="试算" />
        <UiStep title="影响分析" />
        <UiStep title="发布" />
      </UiSteps>
      <div class="toolbar">
        <UiSelect
          size="sm"
          v-model="sceneCode"
          :options="PF_SCENE_CODE_OPTIONS"
          style="width: 140px"
          :disabled="writing"
          @change="resetWorkflow"
        />
        <UiInput
          size="sm"
          v-model="academicYear"
          placeholder="学年"
          style="width: 140px"
          :disabled="writing"
        />
      </div>
      <div v-if="step === 1" class="actions">
        <UiButton
          size="sm"
          variant="primary"
          :loading="trialing"
          :disabled="writing"
          @click="runTrial"
        >
          执行试算
        </UiButton>
      </div>
      <div v-else-if="step === 2" class="actions">
        <UiButton
          size="sm"
          :disabled="writing"
          @click="router.push({ name: 'PortfolioIndicatorOps' })"
        >
          计分与审计
        </UiButton>
        <UiButton
          size="sm"
          :loading="previewing"
          :disabled="writing"
          variant="primary"
          @click="runImpactPreview"
        >
          生成影响报告
        </UiButton>
      </div>
      <div v-else class="actions">
        <p>影响报告编号：{{ impactReportId }}</p>
        <UiCard v-if="impactReport" title="变更治理（§8.31.1）" class="impact-summary-card">
          <div class="impact-summary">
            <span>
              变更级别
              <UiTag tone="blue">{{ changeLevelLabel(impactReport.changeLevel) }}</UiTag>
              <code v-if="impactReport.changeLevel">{{ impactReport.changeLevel }}</code>
            </span>
            <span>
              审批状态
              <UiTag
                :tone="
                  canPublish
                    ? 'green'
                    : impactReport.approvalStatus === 'REJECTED'
                      ? 'red'
                      : 'orange'
                "
              >
                {{ approvalStatusLabel(impactReport.approvalStatus) }}
              </UiTag>
            </span>
            <span v-if="impactReport.approvedTime">审批时间 {{ impactReport.approvedTime }}</span>
            <span v-if="impactReport.approvalOpinion">审批意见 {{ impactReport.approvalOpinion }}</span>
          </div>
          <div v-if="impactReport.evaluationTaskSummary" class="impact-summary impact-task-summary">
            <span>进行中任务 {{ impactReport.evaluationTaskSummary.inProgressTaskCount ?? 0 }}</span>
            <span>已冻结规则任务
              {{ impactReport.evaluationTaskSummary.frozenInProgressTaskCount ?? 0 }}</span>
            <span>已公示/归档
              {{ impactReport.evaluationTaskSummary.publicizedOrArchivedTaskCount ?? 0 }}</span>
            <span>受影响教师 {{ impactReport.evaluationTaskSummary.affectedTeacherCount ?? 0 }}</span>
          </div>
          <p v-if="requiresApproval && impactReport.approvalStatus === 'PENDING_APPROVAL'">
            该影响报告已进入独立审批队列，创建人不能审批本人报告。
          </p>
          <div v-if="showTaskStrategy" class="strategy-row">
            <label>进行中任务规则策略</label>
            <UiSelect
              size="sm"
              v-model="currentTaskRuleStrategy"
              :options="PF_CURRENT_TASK_RULE_STRATEGY_OPTIONS"
              style="width: 220px"
              :disabled="writing"
            />
            <p class="strategy-hint">
              A 级强制沿用原规则；B 级须由管理员明确选择沿用或切换并留审计。
            </p>
          </div>
        </UiCard>
        <UiCard v-if="impactSummary" title="影响摘要" class="impact-summary-card">
          <div class="impact-summary">
            <span>草稿指标 {{ impactSummary.draftIndicatorCount ?? 0 }}</span>
            <span>已发布指标 {{ impactSummary.publishedIndicatorCount ?? 0 }}</span>
            <span>新增 {{ impactSummary.addedCount ?? 0 }}</span>
            <span>变更 {{ impactSummary.changedCount ?? 0 }}</span>
            <span>移除 {{ impactSummary.removedCount ?? 0 }}</span>
          </div>
          <ul v-if="impactSummary.changedIndicators?.length" class="impact-changed-list">
            <li
              v-for="item in impactSummary.changedIndicators"
              :key="`${item.indicatorCode}-${item.changeType}`"
            >
              {{ item.indicatorCode }}
              <span v-if="item.changeType">（{{ item.changeType }}）</span>
            </li>
          </ul>
        </UiCard>
        <UiButton
          size="sm"
          variant="primary"
          :loading="publishing"
          :disabled="writing || !canPublish"
          @click="publish"
        >
          确认发布
        </UiButton>
        <UiButton
          size="sm"
          v-if="impactReportId"
          :loading="exporting"
          :disabled="writing"
          @click="exportImpact"
        >
          导出影响报告
        </UiButton>
      </div>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.readiness {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
}
.readiness-error {
  margin: 0 0 12px;
  color: var(--dp-error);
}
.scene-tag {
  color: var(--dp-text-secondary);
}
.impact-summary-card {
  width: 100%;
}
.impact-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}
.impact-task-summary {
  margin-top: 8px;
}
.approval-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.strategy-row {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.strategy-hint {
  margin: 0;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.impact-changed-list {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
</style>
