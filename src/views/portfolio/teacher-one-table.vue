<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDeptStructureStatVO, PortfolioTeacherOneTableSummaryVO } from '@/apis/portfolio/teacher'
import type { PortfolioTeacherIdentityType } from '@/apis/portfolio/types'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const summary = ref<PortfolioTeacherOneTableSummaryVO | null>(null)
const deptStats = ref<PortfolioDeptStructureStatVO | null>(null)

const categoryColumns: ColumnsType = [
  { title: '档案分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 88 },
  { title: '正式档案', dataIndex: 'officialRecordId', key: 'officialRecordId', width: 120 },
]

async function loadSummary() {
  loading.value = true
  try {
    const teacherId = typeof route.query.teacherId === 'string' ? route.query.teacherId : undefined
    summary.value = await portfolioTeacherApi.getOneTableSummary({ teacherId })
    deptStats.value = await portfolioTeacherApi.deptStructureStats()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

function identityLabel(tag: PortfolioTeacherIdentityType) {
  return strictEnumLabel(PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL, tag, '身份标签')
}

function openCorrection() {
  router.push('/portfolio/teacher/correction')
}

onMounted(loadSummary)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="教师一张表" subtitle="主数据 · 身份标签 · 档案分类 · 成果荣誉汇总" />
    <a-spin :spinning="loading">
      <UiCard v-if="summary" title="教师概要">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="工号">
            {{ summary.teacherNumber ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ summary.nickName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="院系">
            {{ summary.departmentName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="职称">
            {{ summary.title ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="成果数">
            {{ summary.achievementCount ?? 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="荣誉数">
            {{ summary.honorCount ?? 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="身份标签" :span="3">
            <UiTag v-for="tag in summary.identityTags" :key="tag" tone="blue" style="margin-right: 4px">
              {{ identityLabel(tag) }}
            </UiTag>
            <span v-if="!summary.identityTags.length">—</span>
          </a-descriptions-item>
        </a-descriptions>
        <div class="actions">
          <UiButton @click="openCorrection">
            数据纠错
          </UiButton>
        </div>
      </UiCard>
      <UiCard v-if="summary" title="档案分类汇总" style="margin-top: 16px">
        <UiDataTable :columns="categoryColumns" :data-source="summary.categories" row-key="categoryId" :pagination="false" />
      </UiCard>
      <UiCard v-if="deptStats" title="院系师资结构" style="margin-top: 16px">
        <p class="dept-total">
          教师总数 {{ deptStats.totalTeacherCount }}
        </p>
        <a-table
          size="small"
          :pagination="false"
          :data-source="deptStats.departments"
          row-key="departmentId"
          :columns="[
            { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
            { title: '人数', dataIndex: 'teacherCount', key: 'teacherCount', width: 88 },
          ]"
        />
      </UiCard>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped>
.actions {
  margin-top: 12px;
}
.dept-total {
  margin: 0 0 8px;
  font-size: 14px;
}
</style>
