<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherPkCompareVO,
  PortfolioTeacherRecommendCandidateVO,
  PortfolioTeacherRecommendRuleVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS } from '@/apis/portfolio/enums'
import { portfolioTeacherRecommendationApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const rules = ref<PortfolioTeacherRecommendRuleVO[]>([])
const candidates = ref<PortfolioTeacherRecommendCandidateVO[]>([])
const pkResult = ref<PortfolioTeacherPkCompareVO | null>(null)
const selectedRuleId = ref('')
const lastRunId = ref('')
const loading = ref(false)

const ruleForm = reactive({
  ruleName: '',
  minHonorCount: 1,
  requireDualTeacher: false,
  topLimit: 10,
})

const pkForm = reactive({
  teacherUserIds: '',
})

const candidateColumns: ColumnsType = [
  { title: '排名', dataIndex: 'rankOrder', key: 'rankOrder', width: 64 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '评分', dataIndex: 'ruleScore', key: 'ruleScore', width: 80 },
  { title: '推荐理由', dataIndex: 'reasonText', key: 'reasonText' },
]

async function loadRules() {
  try {
    rules.value = await portfolioTeacherRecommendationApi.listRules()
    if (!selectedRuleId.value && rules.value.length > 0) {
      selectedRuleId.value = rules.value[0].id
    }
  }
  catch (error) {
    showUserError(error)
  }
}

async function saveRule() {
  if (!ruleForm.ruleName.trim()) {
    message.warning('请填写规则名称')
    return
  }
  try {
    await portfolioTeacherRecommendationApi.saveRule({
      ruleName: ruleForm.ruleName.trim(),
      recommendScene: 'EXCELLENT_TEACHER',
      filterSnapshot: {
        minHonorCount: ruleForm.minHonorCount,
        requireDualTeacher: ruleForm.requireDualTeacher,
        topLimit: ruleForm.topLimit,
      },
    })
    message.success('规则已保存')
    ruleForm.ruleName = ''
    await loadRules()
  }
  catch (error) {
    showUserError(error)
  }
}

async function executeRuleRun() {
  if (!selectedRuleId.value) {
    message.warning('请先选择规则')
    return
  }
  loading.value = true
  try {
    lastRunId.value = await portfolioTeacherRecommendationApi.executeRun({
      ruleId: selectedRuleId.value,
    })
    message.success('规则推荐已完成')
    await loadCandidates()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function executeAiExplain() {
  if (!selectedRuleId.value) {
    message.warning('请先选择规则')
    return
  }
  loading.value = true
  try {
    lastRunId.value = await portfolioTeacherRecommendationApi.executeRun({
      ruleId: selectedRuleId.value,
    })
    await portfolioTeacherRecommendationApi.explainSubmit({ runId: lastRunId.value })
    message.success('规则执行完成，AI 解释任务已提交')
    await loadCandidates()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadCandidates() {
  if (!lastRunId.value) {
    return
  }
  try {
    const page = await portfolioTeacherRecommendationApi.pageCandidates({
      runId: lastRunId.value,
      pageNum: 1,
      pageSize: 50,
    })
    candidates.value = readPageList(page)
  }
  catch (error) {
    showUserError(error)
  }
}

async function runPkCompare() {
  const ids = pkForm.teacherUserIds.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)
  if (ids.length < 2 || ids.length > 5) {
    message.warning('请选择 2–5 名教师用户 ID')
    return
  }
  try {
    pkResult.value = await portfolioTeacherRecommendationApi.pkCompare({
      teacherUserIds: ids,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
    })
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(loadRules)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="优秀教师推荐" subtitle="规则筛选 + 智能解释 + PK 佐证" />
    <UiCard title="规则配置">
      <div class="form-row">
        <a-input v-model:value="ruleForm.ruleName" placeholder="规则名称" style="width: 160px" />
        <a-input-number v-model:value="ruleForm.minHonorCount" :min="0" placeholder="最低荣誉数" />
        <a-checkbox v-model:checked="ruleForm.requireDualTeacher">
          要求双师
        </a-checkbox>
        <a-input-number v-model:value="ruleForm.topLimit" :min="1" :max="50" placeholder="候选上限" />
        <UiButton variant="primary" @click="saveRule">
          保存规则
        </UiButton>
      </div>
      <a-select v-model:value="selectedRuleId" placeholder="选择规则" style="width: 240px; margin-top: 8px">
        <a-select-option v-for="rule in rules" :key="rule.id" :value="rule.id">
          {{ rule.ruleName }}
        </a-select-option>
      </a-select>
    </UiCard>
    <UiCard title="执行推荐" style="margin-top: 16px">
      <div class="form-row">
        <UiButton :loading="loading" @click="executeRuleRun">
          规则推荐
        </UiButton>
        <UiButton variant="primary" :loading="loading" @click="executeAiExplain">
          规则执行 → AI 解释
        </UiButton>
        <UiButton @click="loadCandidates">
          刷新候选
        </UiButton>
      </div>
      <UiDataTable
        :columns="candidateColumns"
        :data-source="candidates"
        :loading="loading"
        row-key="id"
        style="margin-top: 16px"
      />
    </UiCard>
    <UiCard title="PK 多维对比" style="margin-top: 16px">
      <div class="form-row">
        <a-input v-model:value="pkForm.teacherUserIds" placeholder="教师 ID，逗号分隔（2–5人）" style="width: 360px" />
        <UiButton @click="runPkCompare">
          对比
        </UiButton>
      </div>
      <div v-if="pkResult" class="pk-grid">
        <div v-for="teacher in pkResult.teachers" :key="teacher.teacherUserId" class="pk-col">
          <div class="pk-title">
            教师 {{ teacher.teacherUserId }}
          </div>
          <div v-for="row in teacher.dimensionRows" :key="row.dimensionCode" class="pk-row">
            {{ row.dimensionLabel }}：{{ row.dimensionScore }}
          </div>
        </div>
      </div>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pk-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}
.pk-col {
  min-width: 200px;
  padding: 8px;
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 4px;
}
.pk-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.pk-row {
  font-size: 13px;
  line-height: 1.6;
}
</style>
