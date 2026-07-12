<script setup lang="ts">
import type { PortfolioTeacherPkCompareVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import {
  portfolioTeacherSelectOptionsFromSummaries,
  resolvePortfolioTeacherDisplayName,
} from '@/utils/portfolio-teacher-display'

const loading = ref(false)
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const selectedTeacherIds = ref<string[]>([])
const pkResult = ref<PortfolioTeacherPkCompareVO | null>(null)
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))

function resolveTeacherTitle(teacherUserId: string): string {
  const teacher = teachers.value.find((item) => item.userId === teacherUserId)
  if (!teacher) {
    return `教师 ${teacherUserId}`
  }
  const displayName = resolvePortfolioTeacherDisplayName(teacher)
  if (!displayName) {
    return `教师 ${teacherUserId}`
  }
  return teacher.teacherNumber?.trim() ? `${displayName} · ${teacher.teacherNumber}` : displayName
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

async function loadTeachers(keyword?: string) {
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    mergeTeacherOptions(page.list)
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

async function runPkCompare() {
  if (selectedTeacherIds.value.length < 2 || selectedTeacherIds.value.length > 5) {
    message.warning('请选择 2–5 名教师')
    return
  }
  loading.value = true
  pkResult.value = null
  try {
    pkResult.value = await portfolioAnalysisApi.pkCompare({
      teacherUserIds: selectedTeacherIds.value,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
    })
  } catch (error) {
    showUserError(error, '教师 PK 对比失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadTeachers()
})

onUnmounted(() => {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="教师 PK 对比"
        subtitle="多维画像分横向对比"
      />
    </template>
    <UiCard title="对比范围">
      <a-select
        v-model:value="selectedTeacherIds"
        mode="multiple"
        placeholder="选择 2–5 名教师"
        :options="teacherOptions"
        class="teacher-pk__field"
        show-search
        :filter-option="false"
        option-label-prop="label"
        @focus="() => loadTeachers()"
        @search="handleTeacherSearch"
      />
      <UiButton variant="primary" :loading="loading" @click="runPkCompare"> 开始对比 </UiButton>
    </UiCard>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !pkResult" description="选择教师后发起对比" />
      <div v-else-if="pkResult" class="teacher-pk__grid">
        <UiCard
          v-for="teacher in pkResult.teachers"
          :key="teacher.teacherUserId"
          :title="resolveTeacherTitle(teacher.teacherUserId)"
        >
          <table class="teacher-pk__table">
            <thead>
              <tr>
                <th>维度</th>
                <th>得分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in teacher.dimensionRows" :key="row.dimensionCode">
                <td>{{ row.dimensionLabel }}</td>
                <td>{{ row.dimensionScore }}</td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </div>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped>
.teacher-pk__field {
  width: 100%;
  max-width: 480px;
  margin-right: 8px;
}

.teacher-pk__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.teacher-pk__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.teacher-pk__table th,
.teacher-pk__table td {
  padding: 8px;
  border-bottom: 1px solid var(--dp-border, #f0f0f0);
  text-align: left;
}
</style>
