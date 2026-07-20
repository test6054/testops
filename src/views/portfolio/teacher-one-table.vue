<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherIdentityTypeCode } from '@/apis/portfolio/enums'
import type { PortfolioTeacherOneTableSummaryVO } from '@/apis/portfolio/teacher'
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PortfolioCompletenessLevelDescription,
  PortfolioTeacherIdentityTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { PORTFOLIO_COMPLETENESS_LEVEL_TONE } from '@/apis/portfolio/types'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const loading = ref(false)
const exporting = ref(false)
const loadFailed = ref(false)
const summary = ref<PortfolioTeacherOneTableSummaryVO | null>(null)
const requestToken = ref(0)

const categoryColumns: ColumnsType = [
  { title: '档案分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 88, align: 'right' },
  { title: '正式档案', dataIndex: 'officialRecordId', key: 'officialRecordId', width: 120 },
  { title: '操作', key: 'actions', width: 180 },
]

async function loadSummary() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    exporting.value = false
    loadFailed.value = false
    summary.value = null
    return
  }
  exporting.value = false
  loading.value = true
  loadFailed.value = false
  summary.value = null
  try {
    const nextSummary = await portfolioTeacherApi.getOneTableSummary({
      teacherId: targetTeacherId.value || undefined,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    summary.value = nextSummary
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    summary.value = null
    loadFailed.value = true
    showUserError(error, '加载教师一张表失败')
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

function openCourseArchive() {
  void router.push({
    path: '/portfolio/teacher/course-archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function completenessSummaryText(summaryData: PortfolioTeacherOneTableSummaryVO): string {
  if (summaryData.completenessPercent == null) {
    return '—'
  }
  const level = summaryData.completenessLevel
    ? strictEnumLabel(
        PortfolioCompletenessLevelDescription,
        summaryData.completenessLevel,
        '档案完整度分级',
      )
    : ''
  return level
    ? `${summaryData.completenessPercent}% · ${level}`
    : `${summaryData.completenessPercent}%`
}

function courseArchiveSummaryText(summaryData: PortfolioTeacherOneTableSummaryVO): string {
  if ((summaryData.courseArchiveFrameworkSlotTotal ?? 0) <= 0) {
    return '—'
  }
  return `${summaryData.currentAcademicYear ?? '本学年'} · 讲授 ${summaryData.courseArchiveTaughtCourseCount ?? 0} 门 · 五框架 ${summaryData.courseArchiveFrameworkSlotDone ?? 0}/${summaryData.courseArchiveFrameworkSlotTotal ?? 0} · 齐备 ${summaryData.courseArchiveFullyCompleteCount ?? 0} 门`
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
    showFormValidationMessage('请先选择目标教师')
    return
  }
  const scopeToken = requestToken.value
  const teacherId = targetTeacherId.value
  exporting.value = true
  try {
    const result = await portfolioTeacherApi.exportOneTable({
      teacherId: teacherId || undefined,
    })
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    await downloadPortfolioExcelExport(result)
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    message.success(`已导出 ${result.rowCount} 行`)
  } catch (error) {
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    showUserError(error, '导出教师一张表失败')
  } finally {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      exporting.value = false
    }
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
            size="sm"
            :loading="loading"
            :disabled="exporting || (canPickTeachers && !targetTeacherId)"
            @click="loadSummary"
          >
            刷新
          </UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :loading="exporting"
            :disabled="loading || (canPickTeachers && !targetTeacherId)"
            @click="exportOneTable"
          >
            导出一张表
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiSpin :spinning="loading">
      <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
      <UiEmpty size="sm" v-else-if="loadFailed && !loading" description="加载教师一张表失败" />
      <UiEmpty size="sm" v-else-if="!loading && !summary" description="暂无教师一张表数据" />
      <UiCard v-if="summary" title="教师概要">
        <div v-if="summary.correctionPending" class="correction-badge">
          <UiTag tone="orange"> 纠错待处理 </UiTag>
        </div>
        <UiDescriptions :column="3" size="small" bordered>
          <UiDescriptionsItem label="工号">
            {{ summary.teacherNumber ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="姓名">
            {{ summary.nickName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="院系">
            {{ summary.departmentName ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="职称">
            {{ summary.title ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="成果数">
            {{ summary.achievementCount ?? 0 }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="荣誉数">
            {{ summary.honorCount ?? 0 }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="完整度">
            <UiTag
              v-if="summary.completenessLevel"
              :tone="PORTFOLIO_COMPLETENESS_LEVEL_TONE[summary.completenessLevel]"
              size="sm"
            >
              {{ completenessSummaryText(summary) }}
            </UiTag>
            <span v-else>{{ completenessSummaryText(summary) }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="课程五框架" :span="2">
            {{ courseArchiveSummaryText(summary) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="身份标签" :span="3">
            <PortfolioOwnerIdentityLayersCell
              v-if="summary.ownerIdentityLayers?.length"
              :layers="summary.ownerIdentityLayers"
              :note="summary.ownerMultiIdentityNote"
              :row-key="summary.teacherUserId"
              show-note
            />
            <template v-else>
              <UiTag
                v-for="tag in summary.identityTags"
                :key="tag"
                tone="blue"
                style="margin-right: 4px"
              >
                {{ identityLabel(tag) }}
              </UiTag>
              <span v-if="!summary.identityTags.length">—</span>
            </template>
          </UiDescriptionsItem>
        </UiDescriptions>
        <div class="actions">
          <UiButton size="sm" @click="openCorrection"> 数据纠错 </UiButton>
          <UiButton
            size="sm"
            v-if="(summary.courseArchiveTaughtCourseCount ?? 0) > 0"
            @click="openCourseArchive"
          >
            课程档案
          </UiButton>
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
    </UiSpin>
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
</style>
