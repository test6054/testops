<script setup lang="ts">
import type {
  PortfolioImpactIndicatorSummaryDto,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioPublishImpactReportVO,
} from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  PF_SCENE_CODE_OPTIONS,
  PfIndicatorBusinessReferenceSceneDescription,
  PfSceneCode,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
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
    message.success(`已启用 ${result.enabledCount} 项指标`)
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
      message.error('试算未通过，无法进入影响分析')
      return
    }
    workflowSceneCode.value = targetSceneCode
    step.value = 2
    message.success('试算通过')
  } catch (error) {
    showUserError(error, '指标试算失败')
  } finally {
    endOperation(operation)
  }
}

function parseImpactSummary(report: PortfolioPublishImpactReportVO): boolean {
  if (!report.indicatorSummaryJson) {
    impactSummary.value = null
    return false
  }
  try {
    const parsed: unknown = JSON.parse(report.indicatorSummaryJson)
    if (typeof parsed !== 'object' || parsed === null) {
      impactSummary.value = null
      return false
    }
    impactSummary.value = {
      draftIndicatorCount: readOptionalNumber(parsed, 'draftIndicatorCount'),
      publishedIndicatorCount: readOptionalNumber(parsed, 'publishedIndicatorCount'),
      addedCount: readOptionalNumber(parsed, 'addedCount'),
      removedCount: readOptionalNumber(parsed, 'removedCount'),
      changedCount: readOptionalNumber(parsed, 'changedCount'),
    }
    return true
  } catch {
    impactSummary.value = null
    return false
  }
}

function readOptionalNumber(
  source: object,
  key: keyof PortfolioImpactIndicatorSummaryDto,
): number | undefined {
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  if (value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? value : undefined
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
    if (!parseImpactSummary(report)) {
      impactReportId.value = ''
      impactReport.value = null
      message.error('影响分析摘要解析失败，请重新生成影响分析')
      return
    }
    impactReportId.value = reportId
    impactReport.value = report
    step.value = 3
    message.success('影响分析完成')
  } catch (error) {
    impactReportId.value = ''
    impactReport.value = null
    impactSummary.value = null
    showUserError(error, '生成影响分析失败')
  } finally {
    endOperation(operation)
  }
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
    const snapshotId = await portfolioIndicatorTenantApi.publishModel({
      sceneCode: targetSceneCode,
      impactReportId: targetImpactReportId,
      academicYear: targetAcademicYear,
    })
    message.success('发布成功')
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
    message.success('影响报告已导出')
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
        variant="outline"
        :loading="enabling"
        :disabled="writing"
        @click="enableAllIndicators"
      >
        启用 T001–T100
      </UiButton>
    </UiCard>
    <UiCard>
      <a-steps :current="step - 1" size="small" style="margin-bottom: 16px">
        <a-step title="试算" />
        <a-step title="影响分析" />
        <a-step title="发布" />
      </a-steps>
      <div class="toolbar">
        <a-select
          v-model:value="sceneCode"
          :options="PF_SCENE_CODE_OPTIONS"
          style="width: 140px"
          :disabled="writing"
          @change="resetWorkflow"
        />
        <a-input
          v-model:value="academicYear"
          placeholder="学年"
          style="width: 140px"
          :disabled="writing"
        />
      </div>
      <div v-if="step === 1" class="actions">
        <UiButton variant="primary" :loading="trialing" :disabled="writing" @click="runTrial">
          执行试算
        </UiButton>
      </div>
      <div v-else-if="step === 2" class="actions">
        <UiButton :disabled="writing" @click="router.push({ name: 'PortfolioIndicatorOps' })">
          计分与审计
        </UiButton>
        <UiButton
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
        <UiCard v-if="impactSummary" title="影响摘要" class="impact-summary-card">
          <div class="impact-summary">
            <span>草稿指标 {{ impactSummary.draftIndicatorCount ?? 0 }}</span>
            <span>已发布指标 {{ impactSummary.publishedIndicatorCount ?? 0 }}</span>
            <span>新增 {{ impactSummary.addedCount ?? 0 }}</span>
            <span>变更 {{ impactSummary.changedCount ?? 0 }}</span>
            <span>移除 {{ impactSummary.removedCount ?? 0 }}</span>
          </div>
        </UiCard>
        <a-collapse v-if="impactReport?.indicatorSummaryJson" ghost class="impact-json-collapse">
          <a-collapse-panel key="raw-json" header="查看原始结构化文本">
            <pre class="impact-json">{{ impactReport.indicatorSummaryJson }}</pre>
          </a-collapse-panel>
        </a-collapse>
        <UiButton variant="primary" :loading="publishing" :disabled="writing" @click="publish">
          确认发布
        </UiButton>
        <UiButton
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
  color: var(--ant-color-error);
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
.impact-json-collapse {
  width: 100%;
}
.impact-json {
  width: 100%;
  max-height: 160px;
  overflow: auto;
  margin: 8px 0;
  padding: 8px;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  font-size: 12px;
}
</style>
