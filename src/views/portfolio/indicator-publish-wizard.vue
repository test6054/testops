<script setup lang="ts">
import type {
  PortfolioImpactIndicatorSummaryDto,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioPublishImpactReportVO,
} from '@/apis/portfolio/indicator-types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  PF_CURRENT_TASK_RULE_STRATEGY_OPTIONS,
  PF_SCENE_CODE_OPTIONS,
  PfCurrentTaskRuleStrategyCode,
  pfImpactApprovalAllowsPublish,
  PfImpactApprovalStatusCode,
  PfImpactApprovalStatusDescription,
  PfRuleChangeLevelCode,
  PfRuleChangeLevelDescription,
  pfRuleChangeLevelRequiresApproval,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStep from '@/components/ui-guide/ui/UiStep.vue'
import UiSteps from '@/components/ui-guide/ui/UiSteps.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const sceneCode = ref<PfSceneCode>(PfSceneCode.PERFORMANCE)
const academicYear = ref(getDefaultAcademicYearAndSemester().academicYear)
const step = ref(1)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const trialing = computed(() => operationKey.value === 'trial')
const previewing = computed(() => operationKey.value === 'impact')
const publishing = computed(() => operationKey.value === 'publish')
const enabling = computed(() => operationKey.value === 'enable-all')
const exporting = computed(() => operationKey.value === 'export-impact')
const exportConfirmOpen = ref(false)
const exportPurpose = ref('')
const impactReportId = ref('')
const trialPassed = ref(false)
const workflowDraftHash = ref('')
const draftHashStale = ref(false)
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
  workflowDraftHash.value = ''
  draftHashStale.value = false
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
    if (!model.draftSnapshotHash) {
      void message.error('试算结果缺少草稿 hash，无法继续发布流程')
      return
    }
    workflowSceneCode.value = targetSceneCode
    workflowDraftHash.value = model.draftSnapshotHash
    draftHashStale.value = false
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
  if (!workflowDraftHash.value) {
    showFormValidationMessage('试算草稿 hash 缺失，请重新试算')
    resetWorkflow()
    return
  }
  const targetSceneCode = sceneCode.value
  const expectedDraftHash = workflowDraftHash.value
  const operation = 'impact'
  if (!beginOperation(operation)) return
  try {
    const currentModel = await portfolioIndicatorTenantApi.getModel({
      sceneCode: targetSceneCode,
    })
    if (sceneCode.value !== targetSceneCode || workflowSceneCode.value !== targetSceneCode) return
    if (currentModel.draftSnapshotHash !== expectedDraftHash) {
      draftHashStale.value = true
      showFormValidationMessage('草稿 hash 已变化，试算与影响报告已失效，请重新试算')
      resetWorkflow()
      return
    }
    const reportId = await portfolioIndicatorTenantApi.impactPreview({
      sceneCode: targetSceneCode,
    })
    const report = await portfolioIndicatorTenantApi.getImpactReport({
      id: reportId,
    })
    if (sceneCode.value !== targetSceneCode || workflowSceneCode.value !== targetSceneCode) return
    if (report.draftSnapshotHash !== expectedDraftHash) {
      draftHashStale.value = true
      showFormValidationMessage('影响报告草稿 hash 与试算不一致，请重新试算')
      resetWorkflow()
      return
    }
    if (!applyImpactSummary(report)) {
      impactReportId.value = ''
      impactReport.value = null
      void message.error('影响分析摘要缺失，请重新生成影响分析')
      return
    }
    impactReportId.value = reportId
    impactReport.value = report
    draftHashStale.value = false
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
    && Boolean(workflowDraftHash.value)
    && !draftHashStale.value
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
    || !workflowDraftHash.value
  ) {
    showFormValidationMessage('当前场景尚未完成试算和影响分析')
    resetWorkflow()
    return
  }
  if (impactReport.value.draftSnapshotHash !== workflowDraftHash.value) {
    draftHashStale.value = true
    showFormValidationMessage('草稿 hash 已漂移，请重新试算并生成影响报告')
    resetWorkflow()
    return
  }
  const operation = 'publish'
  if (!beginOperation(operation)) return
  try {
    const currentModel = await portfolioIndicatorTenantApi.getModel({
      sceneCode: targetSceneCode,
    })
    if (
      sceneCode.value !== targetSceneCode
      || currentModel.draftSnapshotHash !== workflowDraftHash.value
    ) {
      draftHashStale.value = true
      showFormValidationMessage('草稿已被其他管理员修改，请重新试算')
      resetWorkflow()
      endOperation(operation)
      return
    }
  } catch (error) {
    showUserError(error, '发布前校验草稿 hash 失败')
    endOperation(operation)
    return
  }
  if (!pfImpactApprovalAllowsPublish(impactReport.value.approvalStatus)) {
    showFormValidationMessage(
      impactReport.value.changeLevel === PfRuleChangeLevelCode.A
      || impactReport.value.changeLevel === PfRuleChangeLevelCode.B
        ? 'A/B 级变更须先完成影响分析审批，方可发布'
        : '当前影响分析审批状态不允许发布',
    )
    endOperation(operation)
    return
  }
  if (
    impactReport.value.changeLevel === PfRuleChangeLevelCode.B
    && !currentTaskRuleStrategy.value
  ) {
    showFormValidationMessage('B 级变更须选择进行中任务规则策略')
    endOperation(operation)
    return
  }
  if (!/^\d{4}-\d{4}$/.test(targetAcademicYear)) {
    showFormValidationMessage('学年格式应为四位年起止年，中间用短横线连接')
    endOperation(operation)
    return
  }
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

function openExportImpactConfirm() {
  if (!impactReportId.value || writing.value) {
    return
  }
  exportPurpose.value = ''
  exportConfirmOpen.value = true
}

async function exportImpact() {
  if (!impactReportId.value || writing.value) {
    return
  }
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return
  }
  const reportId = impactReportId.value
  const operation = 'export-impact'
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({
      id: reportId,
      exportPurpose: purpose,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    exportConfirmOpen.value = false
    void message.success('影响报告已导出')
  } catch (error) {
    showUserError(error, '导出影响报告失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(loadReadiness)

const IndicatorPublishWorkbenchSubtitle = computed(() => {
  const row = readiness.value
  if (!row) {
    return readinessError.value ? '就绪状态加载失败' : '尚未加载就绪状态'
  }
  const ready = row.allScenesReady ? '全场景就绪' : '场景未齐'
  return `${ready} · 已启用 ${row.enabledIndicatorCount} · 平台 ${row.platformIndicatorCount}`
})

const IndicatorPublishSignalMetrics = computed<SignalMetric[]>(() => {
  if (readinessError.value && !readiness.value) {
    return []
  }
  const row = readiness.value
  if (!row) {
    return applySpotlightEmphasis([
      { key: 'status', label: '就绪状态', value: '未加载', clickable: true },
    ], { primaryKey: 'status', actionLabel: '刷新' })
  }
  return applySpotlightEmphasis([
    {
      key: 'scenes',
      label: '全场景就绪',
      value: row.allScenesReady ? '是' : '否',
      clickable: true,
    },
    {
      key: 'enabled',
      label: '已启用指标',
      value: row.enabledIndicatorCount,
    },
    {
      key: 'platform',
      label: '平台指标',
      value: row.platformIndicatorCount,
    },
    {
      key: 'core',
      label: 'T001-T100',
      value: row.t001T100Enabled ? '已启用' : '未齐',
    },
  ], { primaryKey: 'scenes', actionLabel: '刷新就绪' })
})

function onIndicatorPublishSignalClick(_key: string) {
  void loadReadiness()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        title="规则发布向导"
        :subtitle="IndicatorPublishWorkbenchSubtitle"
      />
    </template>
    <template v-if="IndicatorPublishSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="IndicatorPublishSignalMetrics"
        @metric-click="onIndicatorPublishSignalClick"
      />
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
              PfSceneCodeDescription,
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
      <UiSteps :current="step - 1" size="small" style="margin-bottom: var(--dp-space-block)">
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
        <p v-if="workflowDraftHash">草稿 hash：<code>{{ workflowDraftHash }}</code></p>
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
          :disabled="writing || !workflowDraftHash || draftHashStale"
          variant="outline"
          @click="runImpactPreview"
        >
          生成影响报告
        </UiButton>
      </div>
      <div v-else class="actions">
        <p>影响报告编号：{{ impactReportId }}</p>
        <p v-if="workflowDraftHash">草稿 hash：<code>{{ workflowDraftHash }}</code></p>
        <p v-if="draftHashStale" class="readiness-error">草稿 hash 已失效，请从试算重新开始。</p>
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
                    : impactReport.approvalStatus === PfImpactApprovalStatusCode.REJECTED
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
          <p v-if="requiresApproval && impactReport.approvalStatus === PfImpactApprovalStatusCode.PENDING_APPROVAL">
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
          @click="openExportImpactConfirm"
        >
          导出影响报告
        </UiButton>
      </div>
    </UiCard>
  </StageWorkbenchShell>
  <UiDialog
    v-model:open="exportConfirmOpen"
    title="导出影响报告"
    ok-text="确认导出"
    cancel-text="取消"
    :confirm-loading="exporting"
    @ok="exportImpact"
  >
    <label class="export-purpose__label">导出用途（必填）</label>
    <UiTextarea
      v-model="exportPurpose"
      size="sm"
      :rows="3"
      placeholder="请填写本次导出用途（写入审计）"
      :disabled="exporting"
    />
  </UiDialog>
</template>

<style scoped>
.toolbar,
.actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  align-items: center;
  flex-wrap: wrap;
}
.readiness {
  display: flex;
  gap: var(--dp-space-component);
  flex-wrap: wrap;
  margin-bottom: var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
}
.readiness-error {
  margin: 0 0 var(--dp-space-component);
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
  gap: var(--dp-space-component);
  flex-wrap: wrap;
  font-size: var(--dp-font-size-sm);
}
.impact-task-summary {
  margin-top: var(--dp-space-component-tight);
}
.approval-actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component);
}
.strategy-row {
  margin-top: var(--dp-space-component);
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}
.strategy-hint {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.impact-changed-list {
  margin: var(--dp-space-component) 0 0;
  padding-left: 18px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
</style>
