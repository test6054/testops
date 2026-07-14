<script setup lang="ts">
import type { PortfolioDoubleHighMonitorVO } from '@/apis/portfolio/double-high'
import type { PortfolioCompletenessLevelCode } from '@/apis/portfolio/enums'
import type { PortfolioDeptOneTableSummaryVO } from '@/apis/portfolio/teacher'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioDoubleHighApi } from '@/apis/portfolio/double-high'
import { PortfolioCompletenessLevelDescription } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  flattenPortfolioOrgOptionsUnderDepartment,
  flattenTeachingGroupOptions,
  usePortfolioOrgTree,
} from '@/composables/usePortfolioOrgTree'
import { showUserError } from '@/utils/error-handler'

const { loadTree, departmentOptions: loadDepartmentOptions, treeRoots } = usePortfolioOrgTree()
const router = useRouter()
const route = useRoute()
const departmentOptions = computed(() => loadDepartmentOptions())
const applying = ref(false)
const previewLoading = ref(false)
const deptSummary = ref<PortfolioDeptOneTableSummaryVO | null>(null)
const doubleHighMonitor = ref<PortfolioDoubleHighMonitorVO | null>(null)
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

watch(() => filter.departmentId, () => {
  filter.portfolioOrgId = undefined
  filter.teachingGroupId = undefined
  deptSummary.value = null
  doubleHighMonitor.value = null
})

const previewStats = computed(() => {
  if (!deptSummary.value) {
    return []
  }
  const summary = deptSummary.value
  const items = [
    { label: '教师总数', value: String(summary.teacherCount) },
    { label: '双师人数', value: String(summary.dualTeacherCount) },
    { label: '正高', value: String(summary.titleSeniorCount) },
    { label: '副高', value: String(summary.titleAssociateCount) },
    { label: '完整度达标', value: String(summary.completenessCompleteCount ?? 0) },
    { label: '规划完成率', value: `${summary.developmentPlanCompletionRatePercent ?? 0}%` },
  ]
  if (doubleHighMonitor.value) {
    items.push(
      { label: '建设指数', value: doubleHighMonitor.value.constructionIndex },
      { label: '双高任务完成率', value: `${doubleHighMonitor.value.taskCompletionRatePercent}%` },
    )
    if (doubleHighMonitor.value.baselineConstructionIndex) {
      items.push({ label: '基线指数', value: doubleHighMonitor.value.baselineConstructionIndex })
    }
    if (doubleHighMonitor.value.periodValueAdded) {
      items.push({ label: '周期增值', value: doubleHighMonitor.value.periodValueAdded })
    }
  }
  return items
})

function buildExportPayload() {
  return {
    departmentId: filter.departmentId!,
    planYear: filter.planYear || undefined,
    portfolioOrgId: filter.portfolioOrgId || undefined,
    teachingGroupId: filter.teachingGroupId || undefined,
    completenessLevel: filter.completenessLevel || undefined,
    constructionPeriodLabel: filter.constructionPeriodLabel.trim() || undefined,
    baselinePeriodLabel: filter.baselinePeriodLabel.trim() || undefined,
  }
}

async function loadPreview() {
  if (!filter.departmentId) {
    message.warning('请选择院系')
    return
  }
  if (filter.baselinePeriodLabel.trim() && !filter.constructionPeriodLabel.trim()) {
    message.warning('填写基线周期时必须同时指')
    return
  }
  previewLoading.value = true
  try {
    const payload = buildExportPayload()
    const [summary, monitor] = await Promise.all([
      portfolioTeacherApi.getDeptOneTableSummary({
        departmentId: payload.departmentId,
        planYear: payload.planYear,
        portfolioOrgId: payload.portfolioOrgId,
        teachingGroupId: payload.teachingGroupId,
        completenessLevel: payload.completenessLevel,
      }),
      portfolioDoubleHighApi.getMonitor({
        departmentId: payload.departmentId,
        portfolioOrgId: payload.portfolioOrgId,
        constructionPeriodLabel: payload.constructionPeriodLabel,
        baselinePeriodLabel: payload.baselinePeriodLabel,
      }),
    ])
    deptSummary.value = summary
    doubleHighMonitor.value = monitor
  } catch (error) {
    deptSummary.value = null
    doubleHighMonitor.value = null
    showUserError(error, '加载失败')
  } finally {
    previewLoading.value = false
  }
}

async function applyExport() {
  if (!filter.departmentId) {
    message.warning('请选择院系')
    return
  }
  if (!filter.exportPurpose.trim()) {
    message.warning('请填写导出用途')
    return
  }
  if (filter.baselinePeriodLabel.trim() && !filter.constructionPeriodLabel.trim()) {
    message.warning('填写基线周期时必须同时指')
    return
  }
  applying.value = true
  try {
    await portfolioTeacherApi.applyDeptReportExport({
      ...buildExportPayload(),
      exportPurpose: filter.exportPurpose.trim(),
    })
    message.success('已提交导出审批')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交审批失败')
  } finally {
    applying.value = false
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
  <StageWorkbenchShell title="院系报告">
    <template #context>
      <ContextBar title="院系师资发展报告" subtitle="须经导出审批" />
    </template>
    <UiCard title="导出范围">
      <div class="report-filter">
        <label class="report-filter__field">
          <span>院系</span>
          <UiSelect
            v-model="filter.departmentId"
            :options="departmentOptions"
            placeholder="请选择院系"
            allow-search
          />
        </label>
        <label class="report-filter__field">
          <span>规划年度</span>
          <UiInput v-model="filter.planYear" placeholder="如 2026" />
        </label>
        <label class="report-filter__field">
          <span>专业群/组织</span>
          <UiSelect
            v-model="filter.portfolioOrgId"
            :options="portfolioOrgOptions"
            :disabled="!filter.departmentId"
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
            :disabled="!filter.departmentId"
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
          />
        </label>
        <label class="report-filter__field">
          <span>建设周期</span>
          <UiInput v-model="filter.constructionPeriodLabel" placeholder="如 2025-2026" />
        </label>
        <label class="report-filter__field">
          <span>双高基线周期</span>
          <UiInput v-model="filter.baselinePeriodLabel" placeholder="如 2024-2025" />
        </label>
        <label class="report-filter__field report-filter__field--wide">
          <span>导出用途</span>
          <UiInput v-model="filter.exportPurpose" placeholder="导出审批用途说明" />
        </label>
        <div class="report-filter__actions">
          <UiButton variant="secondary" :loading="previewLoading" @click="loadPreview">
            预览摘要
          </UiButton>
          <UiButton :loading="applying" @click="applyExport">
            提交审批
          </UiButton>
        </div>
      </div>
    </UiCard>
    <UiCard v-if="previewStats.length" title="报告摘要预览">
      <UiStatPanel title="院系报告口径" :items="previewStats" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.report-filter {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
  align-items: end;
}

.report-filter__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.report-filter__field--wide {
  grid-column: span 2;
}

.report-filter__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1100px) {
  .report-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
