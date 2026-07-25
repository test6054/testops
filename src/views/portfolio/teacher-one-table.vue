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
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { PORTFOLIO_COMPLETENESS_LEVEL_TONE } from '@/apis/portfolio/types'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  formatPortfolioNullableCount,
} from '@/utils/portfolio-nullable-count'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const loading = ref(false)
const exporting = ref(false)
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
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
  if (summaryData.courseArchiveFrameworkSlotTotal == null) {
    return '—'
  }
  if (summaryData.courseArchiveFrameworkSlotTotal <= 0) {
    return '未配置'
  }
  const taught = formatPortfolioNullableCount(summaryData.courseArchiveTaughtCourseCount)
  const done = formatPortfolioNullableCount(summaryData.courseArchiveFrameworkSlotDone)
  const total = formatPortfolioNullableCount(summaryData.courseArchiveFrameworkSlotTotal)
  const complete = formatPortfolioNullableCount(summaryData.courseArchiveFullyCompleteCount)
  return `${summaryData.currentAcademicYear ?? '本学年'} · 讲授 ${taught} 门 · 五框架 ${done}/${total} · 齐备 ${complete} 门`
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

function openExportApply() {
  if (canPickTeachers.value && !targetTeacherId.value) {
    showFormValidationMessage('请先选择目标教师')
    return
  }
  if (exporting.value) {
    return
  }
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  if (canPickTeachers.value && !targetTeacherId.value) {
    showFormValidationMessage('请先选择目标教师')
    return Promise.reject(new Error('缺少教师'))
  }
  if (exporting.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  exporting.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.TEACHER_ONE_TABLE,
      businessRef: {
        teacherId: targetTeacherId.value || undefined,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交教师一张表导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交教师一张表导出审批失败')
    return Promise.reject(error)
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
            @click="openExportApply"
          >
            申请导出
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
            {{ formatPortfolioNullableCount(summary.achievementCount) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="荣誉数">
            {{ formatPortfolioNullableCount(summary.honorCount) }}
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
                style="margin-right: var(--dp-space-component-xs)"
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
      <UiCard v-if="summary?.recentChangeSummary?.length" title="近期变更" style="margin-top: var(--dp-space-block)">
        <ul class="change-list">
          <li v-for="(item, index) in summary.recentChangeSummary" :key="index">
            {{ item }}
          </li>
        </ul>
      </UiCard>
      <UiCard v-if="summary" title="档案分类汇总" style="margin-top: var(--dp-space-block)">
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
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出教师一张表"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.actions {
  margin-top: var(--dp-space-component);
}
.correction-badge {
  margin-bottom: var(--dp-space-component-tight);
}
.change-list {
  margin: 0;
  padding-left: 18px;
  font-size: var(--dp-font-size-md);
  line-height: 1.6;
}
</style>
