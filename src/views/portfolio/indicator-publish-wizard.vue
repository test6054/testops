<script setup lang="ts">
import type {
  PfSceneCode,
  PortfolioImpactIndicatorSummaryDto,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioPublishImpactReportVO,
} from '@/apis/portfolio/indicator-types'
import {
  PF_INDICATOR_BUSINESS_REFERENCE_SCENE_LABEL,
  PF_SCENE_CODE_OPTIONS,
} from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'

const router = useRouter()
const sceneCode = ref<PfSceneCode>('PERFORMANCE')
const academicYear = ref('2025-2026')
const step = ref(1)
const trialing = ref(false)
const previewing = ref(false)
const publishing = ref(false)
const enabling = ref(false)
const impactReportId = ref('')
const trialPassed = ref(false)
const readiness = ref<PortfolioIndicatorEngineReadinessVO | null>(null)
const impactReport = ref<PortfolioPublishImpactReportVO | null>(null)
const impactSummary = ref<PortfolioImpactIndicatorSummaryDto | null>(null)

async function loadReadiness() {
  try {
    readiness.value = await portfolioIndicatorTenantApi.referenceStatus()
  } catch (error) {
    showUserError(error)
  }
}

async function enableAllIndicators() {
  enabling.value = true
  try {
    const result = await portfolioIndicatorTenantApi.enableAllConfig()
    message.success(`已启用 ${result.enabledCount} 项指标`)
    await loadReadiness()
  } catch (error) {
    showUserError(error)
  } finally {
    enabling.value = false
  }
}

async function runTrial() {
  trialing.value = true
  try {
    const model = await portfolioIndicatorTenantApi.trialModel({ sceneCode: sceneCode.value })
    trialPassed.value = Boolean(model.trialPassed)
    if (!trialPassed.value) {
      message.error('试算未通过，无法进入影响分析')
      return
    }
    step.value = 2
    message.success('试算通过')
  } catch (error) {
    showUserError(error)
  } finally {
    trialing.value = false
  }
}

function parseImpactSummary(report: PortfolioPublishImpactReportVO): boolean {
  if (!report.indicatorSummaryJson) {
    impactSummary.value = null
    return false
  }
  try {
    impactSummary.value = JSON.parse(
      report.indicatorSummaryJson,
    ) as PortfolioImpactIndicatorSummaryDto
    return true
  } catch {
    impactSummary.value = null
    return false
  }
}

async function runImpactPreview() {
  previewing.value = true
  try {
    impactReportId.value = await portfolioIndicatorTenantApi.impactPreview({
      sceneCode: sceneCode.value,
    })
    impactReport.value = await portfolioIndicatorTenantApi.getImpactReport({
      id: impactReportId.value,
    })
    if (!parseImpactSummary(impactReport.value)) {
      message.error('影响分析摘要解析失败，请重新生成影响分析')
      return
    }
    step.value = 3
    message.success('影响分析完成')
  } catch (error) {
    showUserError(error)
  } finally {
    previewing.value = false
  }
}

async function publish() {
  publishing.value = true
  try {
    const snapshotId = await portfolioIndicatorTenantApi.publishModel({
      sceneCode: sceneCode.value,
      impactReportId: impactReportId.value,
      academicYear: academicYear.value,
    })
    message.success(`发布成功，快照 ID：${snapshotId}`)
    router.push({ name: 'PortfolioIndicatorHistory' })
  } catch (error) {
    showUserError(error)
  } finally {
    publishing.value = false
  }
}

async function exportImpact() {
  if (!impactReportId.value) {
    return
  }
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({
      id: impactReportId.value,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    message.success('影响报告已导出')
  } catch (error) {
    showUserError(error)
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
      <div v-if="readiness" class="readiness">
        <span
          >已启用 {{ readiness.enabledIndicatorCount }} /
          {{ readiness.platformIndicatorCount }}</span
        >
        <span
          v-for="scene in readiness.sceneStatuses"
          :key="scene.referenceScene"
          class="scene-tag"
        >
          {{ PF_INDICATOR_BUSINESS_REFERENCE_SCENE_LABEL[scene.referenceScene] }}：{{
            scene.referencedIndicatorCount
          }}
        </span>
      </div>
      <UiButton variant="outline" :loading="enabling" @click="enableAllIndicators">
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
        <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
        <a-input v-model:value="academicYear" placeholder="学年" style="width: 140px" />
      </div>
      <div v-if="step === 1" class="actions">
        <UiButton variant="primary" :loading="trialing" @click="runTrial"> 执行试算 </UiButton>
      </div>
      <div v-else-if="step === 2" class="actions">
        <UiButton @click="router.push({ name: 'PortfolioIndicatorOps' })"> 计分与审计 </UiButton>
        <UiButton :loading="previewing" variant="primary" @click="runImpactPreview">
          生成影响报告
        </UiButton>
      </div>
      <div v-else class="actions">
        <p>影响报告 ID：{{ impactReportId }}</p>
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
          <a-collapse-panel key="raw-json" header="查看原始 JSON">
            <pre class="impact-json">{{ impactReport.indicatorSummaryJson }}</pre>
          </a-collapse-panel>
        </a-collapse>
        <UiButton variant="primary" :loading="publishing" @click="publish"> 确认发布 </UiButton>
        <UiButton v-if="impactReportId" @click="exportImpact"> 导出影响报告 </UiButton>
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
