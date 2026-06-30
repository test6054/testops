<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDeptStructureStatVO, PortfolioTeacherOneTableSummaryVO } from '@/apis/portfolio/teacher'
import type { PortfolioTeacherIdentityType } from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope, usePortfolioScopedLoader } from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const loading = ref(false)
const exporting = ref(false)
const loadFailed = ref(false)
const summary = ref<PortfolioTeacherOneTableSummaryVO | null>(null)
const deptStats = ref<PortfolioDeptStructureStatVO | null>(null)

const categoryColumns: ColumnsType = [
  { title: '档案分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 88 },
  { title: '正式档案', dataIndex: 'officialRecordId', key: 'officialRecordId', width: 120 },
]

async function loadSummary() {
  if (canPickTeachers.value && !targetTeacherId.value) {
    summary.value = null
    deptStats.value = null
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    summary.value = await portfolioTeacherApi.getOneTableSummary({
      teacherId: targetTeacherId.value || undefined,
    })
    deptStats.value = await portfolioTeacherApi.deptStructureStats()
  }
  catch (error) {
    loadFailed.value = true
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

async function exportOneTable() {
  if (canPickTeachers.value && !targetTeacherId.value) {
    message.warning('请先选择目标教师')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioTeacherApi.exportOneTable({
      teacherId: targetTeacherId.value || undefined,
    })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 行`)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exporting.value = false
  }
}

usePortfolioScopedLoader(() => {
  void loadSummary()
}, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师一张表">
        <template #actions>
          <UiButton :loading="exporting" :disabled="canPickTeachers && !targetTeacherId" @click="exportOneTable">
            导出一张表
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <a-spin :spinning="loading">
      <UiEmpty
        v-if="canPickTeachers && !targetTeacherId"
        description="请从顶部教师范围选择目标教师"
      />
      <UiEmpty
        v-else-if="loadFailed && !loading"
        description="加载教师一张表失败"
      />
      <UiEmpty
        v-else-if="!loading && !summary"
        description="暂无教师一张表数据"
      />
      <UiCard v-if="summary" title="教师概要">
        <div v-if="summary.correctionPending" class="correction-badge">
          <UiTag tone="orange">
            纠错待处理
          </UiTag>
        </div>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="工号">
            {{ summary.teacherNumber ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ summary.nickName }}
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
      <UiCard
        v-if="summary?.recentChangeSummary?.length"
        title="近期变更"
        style="margin-top: 16px"
      >
        <ul class="change-list">
          <li v-for="(item, index) in summary.recentChangeSummary" :key="index">
            {{ item }}
          </li>
        </ul>
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
.correction-badge {
  margin-bottom: 8px;
}
.change-list {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.6;
}
.dept-total {
  margin: 0 0 8px;
  font-size: 14px;
}
</style>
