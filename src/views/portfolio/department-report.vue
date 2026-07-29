<script setup lang="ts">
import type { PortfolioDoubleHighMonitorVO } from '@/apis/portfolio/double-high'
import type { PortfolioCompletenessLevelCode } from '@/apis/portfolio/enums'
import type { PortfolioDeptOneTableSummaryVO } from '@/apis/portfolio/teacher'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioDoubleHighApi } from '@/apis/portfolio/double-high'
import { PortfolioCompletenessLevelDescription } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  flattenPortfolioOrgOptionsUnderDepartment,
  flattenTeachingGroupOptions,
  usePortfolioOrgTree,
} from '@/composables/usePortfolioOrgTree'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'

const { loadTree, departmentOptions: loadDepartmentOptions, treeRoots } = usePortfolioOrgTree()
const router = useRouter()
const route = useRoute()
const departmentOptions = computed(() => loadDepartmentOptions())
const applying = ref(false)
const previewLoading = ref(false)
const deptSummary = ref<PortfolioDeptOneTableSummaryVO | null>(null)
const doubleHighMonitor = ref<PortfolioDoubleHighMonitorVO | null>(null)
const reportContextToken = ref(0)
const previewRequestToken = ref(0)
/** 最近一次成功一表预览绑定的筛选代际；筛选变化后必须重新预览才能提交 */
const previewBoundToken = ref(-1)
const previewBoundPayloadKey = ref('')
const doubleHighFailed = ref(false)
const excludeDoubleHigh = ref(false)
const filter = reactive({
  departmentId: undefined as string | undefined,
  planYear: String(new Date().getFullYear()),
  portfolioOrgId: undefined as string | undefined,
  teachingGroupId: undefined as string | undefined,
  completenessLevel: undefined as PortfolioCompletenessLevelCode | undefined,
  constructionPeriodLabel: '',
  baselinePeriodLabel: '',
  exportPurpose: '院系年度师资发展报告',
})

const portfolioOrgOptions = computed(() => {
  if (!filter.departmentId) {
    return []
  }
  return flattenPortfolioOrgOptionsUnderDepartment(treeRoots.value, filter.departmentId)
})

const teachingGroupOptions = computed(() => {
  if (!filter.departmentId) {
    return []
  }
  return flattenTeachingGroupOptions(treeRoots.value, undefined, filter.departmentId)
})

const completenessOptions = computed(() =>
  Object.entries(PortfolioCompletenessLevelDescription).map(([value, label]) => ({
    value,
    label,
  })),
)

const busy = computed(() => applying.value || previewLoading.value)

function buildExportPayload() {
  const includeDoubleHigh = !excludeDoubleHigh.value
  return {
    departmentId: filter.departmentId!,
    planYear: filter.planYear || undefined,
    portfolioOrgId: filter.portfolioOrgId || undefined,
    teachingGroupId: filter.teachingGroupId || undefined,
    completenessLevel: filter.completenessLevel || undefined,
    includeDoubleHigh,
    constructionPeriodLabel: includeDoubleHigh
      ? (filter.constructionPeriodLabel.trim() || undefined)
      : undefined,
    baselinePeriodLabel: includeDoubleHigh
      ? (filter.baselinePeriodLabel.trim() || undefined)
      : undefined,
  }
}

function payloadKeyOf(payload: ReturnType<typeof buildExportPayload>): string {
  return JSON.stringify(payload)
}

const previewReady = computed(() => {
  if (!deptSummary.value || !filter.departmentId) {
    return false
  }
  if (previewBoundToken.value !== reportContextToken.value) {
    return false
  }
  return previewBoundPayloadKey.value === payloadKeyOf(buildExportPayload())
})

const canApplyExport = computed(() => {
  if (!previewReady.value || busy.value) {
    return false
  }
  if (doubleHighFailed.value && !excludeDoubleHigh.value) {
    return false
  }
  return Boolean(filter.exportPurpose.trim())
})

watch(
  () => filter.departmentId,
  () => {
    filter.portfolioOrgId = undefined
    filter.teachingGroupId = undefined
  },
)

watch(
  () => [
    filter.departmentId,
    filter.planYear,
    filter.portfolioOrgId,
    filter.teachingGroupId,
    filter.completenessLevel,
    filter.constructionPeriodLabel,
    filter.baselinePeriodLabel,
  ],
  () => {
    reportContextToken.value += 1
    previewRequestToken.value += 1
    previewLoading.value = false
    deptSummary.value = null
    doubleHighMonitor.value = null
    previewBoundToken.value = -1
    previewBoundPayloadKey.value = ''
    doubleHighFailed.value = false
    excludeDoubleHigh.value = false
  },
)

/** 报告摘要预览：spotlight 1 主 + N 次，禁止等权 Stat 墙。 */
const previewSignalMetrics = computed<SignalMetric[]>(() => {
  if (!deptSummary.value) {
    return []
  }
  const summary = deptSummary.value
  const metrics: SignalMetric[] = [
    { key: 'teachers', label: '教师总数', value: summary.teacherCount },
    { key: 'dual', label: '双师人数', value: summary.dualTeacherCount },
    { key: 'senior', label: '正高', value: summary.titleSeniorCount },
    { key: 'associate', label: '副高', value: summary.titleAssociateCount },
    {
      key: 'complete',
      label: '完整度达标',
      value: summary.completenessCompleteCount ?? 0,
    },
    {
      key: 'planRate',
      label: '规划完成率',
      value: `${summary.developmentPlanCompletionRatePercent ?? 0}%`,
    },
  ]
  if (excludeDoubleHigh.value) {
    metrics.push({
      key: 'scope',
      label: '数据口径',
      value: '仅院系一表通',
      helper: '不含双高监测',
    })
  } else if (doubleHighMonitor.value) {
    metrics.push(
      {
        key: 'constructionIndex',
        label: '建设指数',
        value: doubleHighMonitor.value.constructionIndex ?? '—',
      },
      {
        key: 'taskRate',
        label: '双高任务完成率',
        value: `${doubleHighMonitor.value.taskCompletionRatePercent}%`,
      },
    )
    if (doubleHighMonitor.value.baselineConstructionIndex) {
      metrics.push({
        key: 'baseline',
        label: '基线指数',
        value: String(doubleHighMonitor.value.baselineConstructionIndex),
      })
    }
    if (doubleHighMonitor.value.periodValueAdded) {
      metrics.push({
        key: 'valueAdded',
        label: '周期增值',
        value: String(doubleHighMonitor.value.periodValueAdded),
      })
    }
  }
  return applySpotlightEmphasis(metrics, { primaryKey: 'teachers' })
})

watch(excludeDoubleHigh, (excluded) => {
  reportContextToken.value += 1
  if (excluded && deptSummary.value) {
    doubleHighMonitor.value = null
    doubleHighFailed.value = false
    previewBoundToken.value = reportContextToken.value
    previewBoundPayloadKey.value = payloadKeyOf(buildExportPayload())
    return
  }
  doubleHighMonitor.value = null
  doubleHighFailed.value = false
  previewBoundToken.value = -1
  previewBoundPayloadKey.value = ''
})

async function loadPreview() {
  if (!filter.departmentId) {
    showFormValidationMessage('请选择院系')
    return
  }
  if (!excludeDoubleHigh.value
    && filter.baselinePeriodLabel.trim()
    && !filter.constructionPeriodLabel.trim()) {
    showFormValidationMessage('填写基线周期时必须同时指定建设周期')
    return
  }
  if (busy.value) {
    return
  }
  const contextToken = reportContextToken.value
  const requestToken = previewRequestToken.value + 1
  previewRequestToken.value = requestToken
  const payload = buildExportPayload()
  previewLoading.value = true
  doubleHighFailed.value = false
  try {
    const summary = await portfolioTeacherApi.getDeptOneTableSummary({
      departmentId: payload.departmentId,
      planYear: payload.planYear,
      portfolioOrgId: payload.portfolioOrgId,
      teachingGroupId: payload.teachingGroupId,
      completenessLevel: payload.completenessLevel,
    })
    if (reportContextToken.value !== contextToken || previewRequestToken.value !== requestToken) {
      return
    }
    deptSummary.value = summary
    previewBoundToken.value = contextToken
    previewBoundPayloadKey.value = payloadKeyOf(payload)
    if (!payload.includeDoubleHigh) {
      doubleHighMonitor.value = null
      doubleHighFailed.value = false
      return
    }
    try {
      doubleHighMonitor.value = await portfolioDoubleHighApi.getMonitor({
        departmentId: payload.departmentId,
        portfolioOrgId: payload.portfolioOrgId,
        constructionPeriodLabel: payload.constructionPeriodLabel,
        baselinePeriodLabel: payload.baselinePeriodLabel,
      })
      if (reportContextToken.value !== contextToken || previewRequestToken.value !== requestToken) {
        return
      }
      doubleHighFailed.value = false
    } catch (error) {
      if (reportContextToken.value !== contextToken || previewRequestToken.value !== requestToken) {
        return
      }
      doubleHighMonitor.value = null
      doubleHighFailed.value = true
      showUserError(error, '双高监测预览加载失败')
    }
  } catch (error) {
    if (reportContextToken.value !== contextToken || previewRequestToken.value !== requestToken) {
      return
    }
    deptSummary.value = null
    doubleHighMonitor.value = null
    previewBoundToken.value = -1
    previewBoundPayloadKey.value = ''
    doubleHighFailed.value = false
    showUserError(error, '院系一表预览加载失败')
  } finally {
    if (reportContextToken.value === contextToken && previewRequestToken.value === requestToken) {
      previewLoading.value = false
    }
  }
}

async function applyExport() {
  if (!filter.departmentId) {
    showFormValidationMessage('请选择院系')
    return
  }
  if (!filter.exportPurpose.trim()) {
    showFormValidationMessage('请填写导出用途')
    return
  }
  if (!excludeDoubleHigh.value
    && filter.baselinePeriodLabel.trim()
    && !filter.constructionPeriodLabel.trim()) {
    showFormValidationMessage('填写基线周期时必须同时指定建设周期')
    return
  }
  if (!previewReady.value) {
    showFormValidationMessage('请先预览与当前筛选一致的报告摘要，再提交审批')
    return
  }
  if (doubleHighFailed.value && !excludeDoubleHigh.value) {
    showFormValidationMessage('双高监测预览失败：请勾选排除双高口径，或重新预览成功后再提交')
    return
  }
  if (busy.value) {
    return
  }
  const contextToken = reportContextToken.value
  const payload = buildExportPayload()
  if (payloadKeyOf(payload) !== previewBoundPayloadKey.value) {
    showFormValidationMessage('筛选已变化，请重新预览摘要后再提交审批')
    return
  }
  applying.value = true
  try {
    await portfolioTeacherApi.applyDeptReportExport({
      ...payload,
      exportPurpose: filter.exportPurpose.trim(),
    })
    if (reportContextToken.value !== contextToken) {
      return
    }
    void message.success('已提交导出审批')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    if (reportContextToken.value !== contextToken) {
      return
    }
    showUserError(error, '提交审批失败')
  } finally {
    if (reportContextToken.value === contextToken) {
      applying.value = false
    }
  }
}

onMounted(() => {
  void loadTree().then(() => {
    const departmentId = route.query.departmentId
    if (typeof departmentId === 'string' && departmentId) {
      filter.departmentId = departmentId
    }
  })
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        title="院系师资发展报告"
        :subtitle="previewSignalMetrics.length > 0 ? `已预览 ${previewSignalMetrics[0]?.value ?? '—'} 人` : '先预览再提交审批'"
      />
    </template>
    <template v-if="previewSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="previewSignalMetrics"
      />
    </template>
    <UiCard title="导出范围（须经导出审批）">
      <div class="report-filter">
        <label class="report-filter__field">
          <span>院系</span>
          <UiSelect
            v-model="filter.departmentId"
            :options="departmentOptions"
            placeholder="请选择院系"
            allow-search
            :disabled="busy"
          />
        </label>
        <label class="report-filter__field">
          <span>规划年度</span>
          <UiInput v-model="filter.planYear" :disabled="busy" placeholder="如 2026" />
        </label>
        <label class="report-filter__field">
          <span>专业群/组织</span>
          <UiSelect
            v-model="filter.portfolioOrgId"
            :options="portfolioOrgOptions"
            :disabled="busy || !filter.departmentId"
            placeholder="全部"
            allow-clear
            allow-search
          />
        </label>
        <label class="report-filter__field">
          <span>教研室</span>
          <UiSelect
            v-model="filter.teachingGroupId"
            :options="teachingGroupOptions"
            :disabled="busy || !filter.departmentId"
            placeholder="全部"
            allow-clear
            allow-search
          />
        </label>
        <label class="report-filter__field">
          <span>完整度</span>
          <UiSelect
            v-model="filter.completenessLevel"
            :options="completenessOptions"
            placeholder="全部"
            allow-clear
            :disabled="busy"
          />
        </label>
        <label class="report-filter__field">
          <span>建设周期</span>
          <UiInput
            v-model="filter.constructionPeriodLabel"
            :disabled="busy || excludeDoubleHigh"
            placeholder="如 2025-2026"
          />
        </label>
        <label class="report-filter__field">
          <span>双高基线周期</span>
          <UiInput
            v-model="filter.baselinePeriodLabel"
            :disabled="busy || excludeDoubleHigh"
            placeholder="如 2024-2025"
          />
        </label>
        <label class="report-filter__field report-filter__field--wide">
          <span>导出用途</span>
          <UiInput v-model="filter.exportPurpose" :disabled="busy" placeholder="导出审批用途说明" />
        </label>
        <div class="report-filter__actions">
          <UiButton
            size="sm"
            variant="secondary"
            :loading="previewLoading"
            :disabled="busy"
            @click="loadPreview"
          >
            预览摘要
          </UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :loading="applying"
            :disabled="!canApplyExport"
            @click="applyExport"
          >
            提交审批
          </UiButton>
        </div>
      </div>
      <UiAlertStrip
        v-if="!previewReady"
        tone="info"
        class="report-preview-gate"
        description="提交审批前须先完成与当前筛选一致的摘要预览；筛选变更后需重新预览。"
      />
      <UiAlertStrip
        v-if="doubleHighFailed && !excludeDoubleHigh"
        tone="warning"
        class="report-preview-gate"
        description="双高监测预览失败。可重新预览，或勾选排除双高口径后仅按院系一表提交审批。"
      />
      <label class="report-exclude-double-high">
        <UiSwitch v-model="excludeDoubleHigh" size="sm" :disabled="busy" />
        <span>排除双高监测口径（产物不含双高 Sheet，仅院系一表通）</span>
      </label>
    </UiCard>
    <UiCard v-if="previewSignalMetrics.length > 0" title="报告摘要预览">
      <SignalBand
        layout="spotlight"
        variant="panel"
        compact
        :metrics="previewSignalMetrics"
      />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.report-filter {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--dp-space-component) var(--dp-space-block);
  align-items: end;
}

.report-filter__field {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
}

.report-filter__field--wide {
  grid-column: span 2;
}

.report-filter__actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.report-preview-gate {
  margin-top: var(--dp-space-component);
}

.report-exclude-double-high {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
}

@media (max-width: 1100px) {
  .report-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
