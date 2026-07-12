<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherIdentityTypeCode } from '@/apis/portfolio/enums'
import { PortfolioTeacherIdentityTypeDescription } from '@/apis/portfolio/enums'
import type {
  PortfolioDeptStructureStatVO,
  PortfolioTeacherOneTableSummaryVO,
} from '@/apis/portfolio/teacher'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
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
const requestToken = ref(0)

const categoryColumns: ColumnsType = [
  { title: '档案分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 88, align: 'right' },
  { title: '正式档案', dataIndex: 'officialRecordId', key: 'officialRecordId', width: 120 },
  { title: '操作', key: 'actions', width: 180 },
]

const deptStructureColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '人数', dataIndex: 'teacherCount', key: 'teacherCount', width: 88, align: 'right' },
]

async function loadSummary() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    summary.value = null
    deptStats.value = null
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    const nextSummary = await portfolioTeacherApi.getOneTableSummary({
      teacherId: targetTeacherId.value || undefined,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    const nextDeptStats = await portfolioTeacherApi.deptStructureStats()
    if (requestToken.value !== currentToken) {
      return
    }
    summary.value = nextSummary
    deptStats.value = nextDeptStats
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    loadFailed.value = true
    showUserError(error)
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function identityLabel(tag: PortfolioTeacherIdentityTypeCode) {
  return strictEnumLabel(PortfolioTeacherIdentityTypeDescription, tag, '身份标签')
}

function openCorrection() {
  void router.push({
    path: '/portfolio/teacher/correction',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function openCategoryArchive(categoryId: string, recordId?: string) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  if (recordId) {
    query.recordId = recordId
  }
  void router.push({
    path: `/portfolio/teacher/archive/${categoryId}`,
    query,
  })
}

function openCategoryCorrection(categoryId: string, recordId?: string) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  query.categoryId = categoryId
  if (recordId) {
    query.archiveRecordId = recordId
  }
  void router.push({
    path: '/portfolio/teacher/correction',
    query,
  })
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
  } catch (error) {
    showUserError(error)
  } finally {
    exporting.value = false
  }
}

usePortfolioScopedLoader(
  () => {
    void loadSummary()
  },
  () => targetTeacherId.value,
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师一张表">
        <template #actions>
          <UiButton
            :loading="exporting"
            :disabled="canPickTeachers && !targetTeacherId"
            @click="exportOneTable"
          >
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
      <UiEmpty v-else-if="loadFailed && !loading" description="加载教师一张表失败" />
      <UiEmpty v-else-if="!loading && !summary" description="暂无教师一张表数据" />
      <UiCard v-if="summary" title="教师概要">
        <div v-if="summary.correctionPending" class="correction-badge">
          <UiTag tone="orange"> 纠错待处理 </UiTag>
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
            <UiTag
              v-for="tag in summary.identityTags"
              :key="tag"
              tone="blue"
              style="margin-right: 4px"
            >
              {{ identityLabel(tag) }}
            </UiTag>
            <span v-if="!summary.identityTags.length">—</span>
          </a-descriptions-item>
        </a-descriptions>
        <div class="actions">
          <UiButton @click="openCorrection"> 数据纠错 </UiButton>
        </div>
      </UiCard>
      <UiCard v-if="summary?.recentChangeSummary?.length" title="近期变更" style="margin-top: 16px">
        <ul class="change-list">
          <li v-for="(item, index) in summary.recentChangeSummary" :key="index">
            {{ item }}
          </li>
        </ul>
      </UiCard>
      <UiCard v-if="summary" title="档案分类汇总" style="margin-top: 16px">
        <UiDataTable
          :columns="categoryColumns"
          :data-source="summary.categories"
          row-key="categoryId"
          flat
          pagination-mode="none"
          :show-pagination="false"
          :sticky-header="false"
          :total="summary.categories.length"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  { key: 'archive', label: '查看档案' },
                  { key: 'correction', label: '发起纠错' },
                ]"
                @action="
                  (key) => {
                    if (key === 'archive') {
                      openCategoryArchive(record.categoryId, record.officialRecordId)
                      return
                    }
                    openCategoryCorrection(record.categoryId, record.officialRecordId)
                  }
                "
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
      <UiCard v-if="deptStats" title="院系师资结构" style="margin-top: 16px">
        <p class="dept-total">教师总数 {{ deptStats.totalTeacherCount }}</p>
        <UiDataTable
          :columns="deptStructureColumns"
          :data-source="deptStats.departments"
          row-key="departmentId"
          size="small"
          flat
          pagination-mode="none"
          :show-pagination="false"
          :sticky-header="false"
          :total="deptStats.departments.length"
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
