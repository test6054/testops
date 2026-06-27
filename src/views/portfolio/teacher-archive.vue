<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioArchiveBagAssembleVO, PortfolioArchiveBagPreviewVO, PortfolioArchiveScoreResultVO } from '@/apis/portfolio/bag-types'
import type {
  PortfolioArchiveRecordDetailVO,
  PortfolioArchiveRecordSourceType,
  PortfolioArchiveRecordStatus,
  PortfolioArchiveRecordSummaryVO,
  PortfolioArchiveTimelineItemVO,
  PortfolioTeacherOneTableCategoryVO,
} from '@/apis/portfolio/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PORTFOLIO_ARCHIVE_BAG_SOURCE_TYPE_LABEL } from '@/apis/portfolio/bag-types'
import { portfolioArchiveBagApi } from '@/apis/portfolio/teacher-platform'
import {
  PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope, usePortfolioScopedLoader } from '@/composables/usePortfolioPageScope'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function archiveRecordStatusLabel(status: PortfolioArchiveRecordStatus): string {
  return strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL, status, '档案记录状态')
}

function archiveRecordStatusTone(status: PortfolioArchiveRecordStatus): BadgeTone {
  return strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, status, '档案记录状态')
}

function archiveRecordSourceTypeLabel(sourceType: PortfolioArchiveRecordSourceType): string {
  return strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL, sourceType, '档案记录来源类型')
}

function bagSourceTypeLabel(sourceType: PortfolioArchiveBagPreviewVO['catalogItems'][number]['sourceType']): string {
  return strictEnumLabel(PORTFOLIO_ARCHIVE_BAG_SOURCE_TYPE_LABEL, sourceType, '档案袋来源类型')
}

const bagFilterFields: FilterField[] = [
  { key: 'academicYear', label: '学年', placeholder: '如 2025-2026', width: 140 },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '选择学期',
    allowClear: true,
    width: 140,
    options: SemesterOptions.map(item => ({ label: item.label, value: item.value })),
  },
  { key: 'courseCode', label: '课程编码', placeholder: '课程编码', width: 140 },
  { key: 'achievementType', label: '成果类型', placeholder: '成果类型', width: 140 },
  { key: 'materialType', label: '材料类型', placeholder: '材料类型', width: 140 },
]

const recordColumns: ColumnsType = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 140 },
  { title: '状态', key: 'recordStatus', width: 100 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '参与评价', key: 'evaluationIncluded', width: 96 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

const fieldColumns: ColumnsType = [
  { title: '字段', key: 'fieldLabel', width: 160 },
  { title: '值', dataIndex: 'fieldValue', key: 'fieldValue' },
  { title: '证据', dataIndex: 'evidenceRef', key: 'evidenceRef', width: 120 },
  { title: '操作', key: 'actions', width: 88 },
]

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const oneTableLoading = ref(false)
const recordLoading = ref(false)
const timelineLoading = ref(false)
const detailLoading = ref(false)
const categories = ref<PortfolioTeacherOneTableCategoryVO[]>([])
const selectedCategoryId = ref<string>()
const records = ref<PortfolioArchiveRecordSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const timeline = ref<PortfolioArchiveTimelineItemVO[]>([])
const drawerOpen = ref(false)
const recordDetail = ref<PortfolioArchiveRecordDetailVO | null>(null)
const bagLoading = ref(false)
const bagSummary = ref<PortfolioArchiveBagAssembleVO | null>(null)
const bagPreview = ref<PortfolioArchiveBagPreviewVO | null>(null)
const scoreResult = ref<PortfolioArchiveScoreResultVO | null>(null)
const scoreLoading = ref(false)
const exportConfirmOpen = ref(false)
const bagFilter = ref({
  academicYear: '',
  semester: '',
  courseCode: '',
  achievementType: '',
  materialType: '',
})

const bagRequest = computed(() => ({
  ...teacherRequest.value,
  academicYear: bagFilter.value.academicYear || undefined,
  semester: bagFilter.value.semester || undefined,
  courseCode: bagFilter.value.courseCode || undefined,
  achievementType: bagFilter.value.achievementType || undefined,
  materialType: bagFilter.value.materialType || undefined,
}))

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {})

const selectedCategory = computed(() =>
  categories.value.find(item => item.categoryId === selectedCategoryId.value))

const canLoadTeacherArchive = computed(() =>
  Boolean(targetTeacherId.value) || !canPickTeachers.value)

async function loadOneTable() {
  if (!canLoadTeacherArchive.value) {
    categories.value = []
    selectedCategoryId.value = undefined
    return
  }
  oneTableLoading.value = true
  try {
    const vo = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    categories.value = vo.categories
    if (!categories.value.some(item => item.categoryId === selectedCategoryId.value)) {
      selectedCategoryId.value = categories.value[0]?.categoryId
    }
  }
  catch (error) {
    showUserError(error, '加载教师一张表失败')
  }
  finally {
    oneTableLoading.value = false
  }
}

async function loadRecords() {
  if (!canLoadTeacherArchive.value) {
    records.value = []
    pageTotal.value = 0
    return
  }
  recordLoading.value = true
  try {
    const page = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: selectedCategoryId.value,
      academicYear: bagFilter.value.academicYear || undefined,
      semester: bagFilter.value.semester || undefined,
      courseCode: bagFilter.value.courseCode || undefined,
      achievementType: bagFilter.value.achievementType || undefined,
      materialType: bagFilter.value.materialType || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    records.value = readPageList(page, '加载档案记录失败')
    pageTotal.value = readPageTotal(page, '加载档案记录失败')
  }
  catch (error) {
    showUserError(error, '加载档案记录失败')
  }
  finally {
    recordLoading.value = false
  }
}

async function loadTimeline() {
  if (!canLoadTeacherArchive.value) {
    timeline.value = []
    return
  }
  timelineLoading.value = true
  try {
    timeline.value = await portfolioArchiveApi.listTimeline({
      ...teacherRequest.value,
      limit: 30,
    })
  }
  catch (error) {
    showUserError(error, '加载成长时间轴失败')
  }
  finally {
    timelineLoading.value = false
  }
}

async function openRecordById(recordId: string) {
  drawerOpen.value = true
  recordDetail.value = null
  detailLoading.value = true
  try {
    recordDetail.value = await portfolioArchiveApi.getRecord(recordId)
  }
  catch (error) {
    showUserError(error, '加载档案详情失败')
  }
  finally {
    detailLoading.value = false
  }
}

function openRecord(row: PortfolioArchiveRecordSummaryVO) {
  void openRecordById(row.id)
}

function openTimelineItem(item: PortfolioArchiveTimelineItemVO) {
  void openRecordById(item.archiveRecordId)
}

function selectCategory(categoryId: string) {
  if (selectedCategoryId.value === categoryId) {
    return
  }
  selectedCategoryId.value = categoryId
  pageNum.value = 1
  void loadRecords()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadRecords()
}

function goCategoryEdit(categoryId: string) {
  void router.push({
    path: `/portfolio/teacher/archive/${categoryId}`,
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goCorrection() {
  void router.push({
    path: '/portfolio/teacher/correction',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goFieldCorrection(fieldCode: string, fieldLabel?: string, fieldValue?: string) {
  if (!recordDetail.value) {
    return
  }
  const query: Record<string, string> = {
    categoryId: recordDetail.value.categoryId,
    archiveRecordId: recordDetail.value.id,
    fieldCode,
  }
  if (targetTeacherId.value) {
    query.teacherId = targetTeacherId.value
  }
  if (fieldLabel) {
    query.fieldLabel = fieldLabel
  }
  if (fieldValue) {
    query.wrongValue = fieldValue
  }
  void router.push({ path: '/portfolio/teacher/correction', query })
}

async function refreshBagScore(silent = false) {
  if (!canLoadTeacherArchive.value) {
    return
  }
  scoreLoading.value = true
  try {
    scoreResult.value = await portfolioArchiveBagApi.computeScore(bagRequest.value)
    if (!silent) {
      message.success(`档案袋评分 ${scoreResult.value.totalScore}`)
    }
  }
  catch (error) {
    showUserError(error, '计算档案袋评分失败')
  }
  finally {
    scoreLoading.value = false
  }
}

async function computeArchiveScore() {
  await refreshBagScore(false)
}

async function assembleBag() {
  if (!canLoadTeacherArchive.value) {
    return
  }
  bagLoading.value = true
  try {
    const result = await portfolioArchiveBagApi.assemble(bagRequest.value)
    bagSummary.value = result
    bagPreview.value = result.preview ?? null
    message.success(`档案袋完整度 ${result.completenessPercent}%`)
    await refreshBagScore(true)
  }
  catch (error) {
    showUserError(error, '汇聚档案袋失败')
  }
  finally {
    bagLoading.value = false
  }
}

async function previewBag() {
  if (!canLoadTeacherArchive.value) {
    return
  }
  bagLoading.value = true
  try {
    bagPreview.value = await portfolioArchiveBagApi.preview(bagRequest.value)
    await refreshBagScore(true)
  }
  catch (error) {
    showUserError(error, '加载档案袋预览失败')
  }
  finally {
    bagLoading.value = false
  }
}

function openExportConfirm() {
  if (!bagPreview.value) {
    void previewBag().then(() => {
      exportConfirmOpen.value = true
    })
    return
  }
  exportConfirmOpen.value = true
}

async function confirmExportBag() {
  if (!canLoadTeacherArchive.value) {
    return
  }
  bagLoading.value = true
  try {
    const result = await portfolioArchiveBagApi.buildMaterialPackage(bagRequest.value)
    if (!result.fileNodeId) {
      showUserError(new Error('导出未返回 ZIP 文件 ID'), '导出档案袋失败')
      return
    }
    await handleDownloadFile({
      fileId: result.fileNodeId,
      fileName: result.fileName,
    })
    exportConfirmOpen.value = false
    await previewBag()
  }
  catch (error) {
    showUserError(error, '导出档案袋失败')
  }
  finally {
    bagLoading.value = false
  }
}

function applyBagFilter() {
  void previewBag()
  void loadRecords()
  void refreshBagScore(true)
}

async function exportBag() {
  openExportConfirm()
}

async function reloadAll() {
  await Promise.all([loadOneTable(), loadTimeline()])
  if (canLoadTeacherArchive.value) {
    await loadRecords()
  }
}

async function openRecordFromRouteQuery() {
  const recordId = typeof route.query.recordId === 'string' ? route.query.recordId : ''
  if (!recordId) {
    return
  }
  await openRecordById(recordId)
}

usePortfolioScopedLoader(async () => {
  pageNum.value = 1
  await reloadAll()
  await openRecordFromRouteQuery()
}, () => targetTeacherId.value)

watch(
  () => route.query.recordId,
  () => {
    void openRecordFromRouteQuery()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="我的档案" description="教师一张表 · 分类档案 · 成长时间轴（§17.2）">
      <template #actions>
        <UiButton :loading="scoreLoading" @click="computeArchiveScore">
          档案评分
        </UiButton>
        <UiButton :loading="bagLoading" @click="previewBag">
          结构化预览
        </UiButton>
        <UiButton :loading="bagLoading" @click="assembleBag">
          汇聚预览
        </UiButton>
        <UiButton :loading="bagLoading" variant="primary" @click="exportBag">
          导出材料包
        </UiButton>
        <UiButton @click="goCorrection">
          我的纠错
        </UiButton>
        <UiButton
          v-if="selectedCategoryId"
          @click="goCategoryEdit(selectedCategoryId)"
        >
          分类填报
        </UiButton>
        <UiButton :loading="oneTableLoading || recordLoading || timelineLoading" @click="reloadAll">
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <UiCard title="档案袋筛选" class="teacher-archive__bag-filter">
      <UiFilterBar
        v-model="bagFilter"
        :fields="bagFilterFields"
        show-labels
        @search="applyBagFilter"
        @reset="applyBagFilter"
      />
    </UiCard>

    <UiCard v-if="scoreResult" title="档案袋评分" class="teacher-archive__bag">
      <p>总分 {{ scoreResult.totalScore }}<template v-if="scoreResult.computedTime"> · 计算于 {{ scoreResult.computedTime }}</template></p>
      <ul v-if="scoreResult.breakdown.length" class="teacher-archive__score-list">
        <li v-for="item in scoreResult.breakdown" :key="item.ruleId">
          {{ item.ruleName }}：{{ item.earnedScore }} 分 — {{ item.explainText }}
        </li>
      </ul>
    </UiCard>

    <UiCard v-if="bagSummary" title="档案袋汇聚" class="teacher-archive__bag">
      <p>完整度 {{ bagSummary.completenessPercent }}% · 已归档 {{ bagSummary.archivedCategoryCount }} 类 · 开放补采 {{ bagSummary.openGapTaskCount }} 项</p>
      <p v-if="bagSummary.missingCategoryNames.length">
        缺失：{{ bagSummary.missingCategoryNames.join('、') }}
      </p>
    </UiCard>

    <UiCard v-if="bagPreview" title="结构化预览" class="teacher-archive__bag-preview">
      <p>附件 {{ bagPreview.totalAttachmentCount }} 个 · 目录 {{ bagPreview.catalogItems.length }} 条</p>
      <div v-if="bagPreview.sections.length" class="teacher-archive__section-tree">
        <section v-for="section in bagPreview.sections" :key="section.sectionType" class="teacher-archive__section">
          <h4 class="teacher-archive__section-title">{{ section.sectionTitle }}</h4>
          <div v-for="group in section.groups" :key="`${section.sectionType}-${group.groupTitle}`" class="teacher-archive__group">
            <p class="teacher-archive__group-title">{{ group.groupTitle }}</p>
            <ul v-if="group.items.length" class="teacher-archive__preview-list">
              <li v-for="item in group.items" :key="`${item.sourceType}-${item.recordId}-${item.title}`">
                {{ item.title }}（{{ bagSourceTypeLabel(item.sourceType) }}）· {{ item.attachmentCount }} 附件
              </li>
            </ul>
            <UiEmpty v-else description="该分组暂无条目" />
          </div>
        </section>
      </div>
      <UiEmpty v-else description="当前筛选下无可预览条目" />
    </UiCard>

    <div v-if="canPickTeachers && !targetTeacherId" class="teacher-archive__hint">
      <UiEmpty description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数" />
    </div>

    <div v-else class="teacher-archive__layout">
      <a-spin :spinning="oneTableLoading">
        <UiCard title="分类导航" class="teacher-archive__nav">
          <ul v-if="categories.length" class="teacher-archive__category-list">
            <li
              v-for="item in categories"
              :key="item.categoryId"
              class="teacher-archive__category-item"
              :class="{ 'teacher-archive__category-item--active': item.categoryId === selectedCategoryId }"
              @click="selectCategory(item.categoryId)"
            >
              <span class="teacher-archive__category-name">{{ item.categoryName }}</span>
              <UiTag
                v-if="item.latestRecordStatus"
                :tone="archiveRecordStatusTone(item.latestRecordStatus)"
              >
                {{ archiveRecordStatusLabel(item.latestRecordStatus) }}
              </UiTag>
              <span class="teacher-archive__category-count">{{ item.recordCount }} 条</span>
            </li>
          </ul>
          <UiEmpty v-else description="尚无档案分类配置" />
        </UiCard>
      </a-spin>

      <UiCard
        :title="selectedCategory ? `${selectedCategory.categoryName} · 材料列表` : '材料列表'"
        class="teacher-archive__records"
      >
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          row-key="id"
          size="small"
          :columns="recordColumns"
          :data-source="records"
          :loading="recordLoading"
          :total="pageTotal"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'recordStatus'">
              <UiTag :tone="archiveRecordStatusTone(record.recordStatus)">
                {{ archiveRecordStatusLabel(record.recordStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'sourceType'">
              {{ archiveRecordSourceTypeLabel(record.sourceType) }}
            </template>
            <template v-else-if="column.key === 'evaluationIncluded'">
              {{ record.evaluationIncluded ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openRecord(record)">
                详情
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <a-spin :spinning="timelineLoading">
        <UiCard title="成长时间轴" class="teacher-archive__timeline">
          <ul v-if="timeline.length" class="teacher-archive__timeline-list">
            <li
              v-for="item in timeline"
              :key="`${item.archiveRecordId}-${item.eventTime}`"
              class="teacher-archive__timeline-item"
              @click="openTimelineItem(item)"
            >
              <p class="teacher-archive__timeline-title">
                {{ item.categoryName }}
                <UiTag :tone="archiveRecordStatusTone(item.recordStatus)">
                  {{ archiveRecordStatusLabel(item.recordStatus) }}
                </UiTag>
              </p>
              <p class="teacher-archive__timeline-meta">
                {{ archiveRecordSourceTypeLabel(item.sourceType) }}
                · {{ item.eventTime }}
              </p>
            </li>
          </ul>
          <UiEmpty v-else description="尚无档案时间轴事件" />
        </UiCard>
      </a-spin>
    </div>

    <UiDrawer v-model:open="drawerOpen" title="档案详情" width="640">
      <a-spin :spinning="detailLoading">
        <template v-if="recordDetail">
          <p class="teacher-archive__detail-meta">
            {{ recordDetail.categoryName }}
            · {{ archiveRecordStatusLabel(recordDetail.recordStatus) }}
            · {{ archiveRecordSourceTypeLabel(recordDetail.sourceType) }}
          </p>
          <p class="teacher-archive__detail-meta">
            更新时间 {{ recordDetail.updateTime }}
            · 参与评价 {{ recordDetail.evaluationIncluded ? '是' : '否' }}
            <template v-if="recordDetail.referenceAiTaskId">
              · AI 任务 {{ recordDetail.referenceAiTaskId }}
            </template>
          </p>
          <UiDataTable
            v-if="recordDetail.fields.length"
            row-key="fieldCode"
            size="small"
            :columns="fieldColumns"
            :data-source="recordDetail.fields"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fieldLabel'">
                <span>{{ record.fieldLabel ?? record.fieldCode }}</span>
                <UiTag v-if="record.fieldCorrecting" tone="orange" class="teacher-archive__correcting-tag">
                  更正中
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="goFieldCorrection(record.fieldCode, record.fieldLabel, record.fieldValue)">
                  发起纠错
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
          <UiEmpty v-else description="暂无字段快照" />
        </template>
      </a-spin>
    </UiDrawer>

    <a-modal
      v-model:open="exportConfirmOpen"
      title="确认导出材料包"
      ok-text="确认导出"
      cancel-text="取消"
      :confirm-loading="bagLoading"
      @ok="confirmExportBag"
    >
      <p v-if="bagPreview">
        将导出 {{ bagPreview.totalAttachmentCount }} 个附件，目录 {{ bagPreview.catalogItems.length }} 条。
      </p>
      <p v-else>
        将按当前筛选条件构建 ZIP 材料包。
      </p>
      <p v-if="bagPreview?.latestMaterialPackageExport" class="teacher-archive__latest-export">
        上次导出 {{ bagPreview.latestMaterialPackageExport.exportedTime }}，
        附件 {{ bagPreview.latestMaterialPackageExport.attachmentCount }} 个。
        本次将生成新的 ZIP，不会覆盖历史导出。
      </p>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-archive__layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 240px;
  gap: var(--dp-space-4, 16px);
  align-items: start;
}

.teacher-archive__category-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__category-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-2, 8px);
  border-radius: var(--dp-radius-control, 4px);
  cursor: pointer;
}

.teacher-archive__category-item--active {
  background: var(--ant-color-fill-quaternary, #f5f5f5);
}

.teacher-archive__category-name {
  flex: 1 1 100%;
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium, 500);
}

.teacher-archive__category-count {
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__timeline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__latest-export {
  margin-top: var(--dp-space-3, 12px);
  font-size: 14px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__timeline-item {
  padding: var(--dp-space-2, 8px) 0;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  cursor: pointer;
}

.teacher-archive__timeline-item:hover {
  background: var(--ant-color-fill-quaternary, #f5f5f5);
}

.teacher-archive__timeline-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin: 0;
  font-size: 14px;
}

.teacher-archive__timeline-meta {
  margin: var(--dp-space-1, 4px) 0 0;
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__detail-meta {
  margin: 0 0 var(--dp-space-2, 8px);
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__correcting-tag {
  margin-left: var(--dp-space-2, 8px);
}

.teacher-archive__score-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 13px;
}

.teacher-archive__bag,
.teacher-archive__bag-filter,
.teacher-archive__bag-preview {
  margin-bottom: var(--dp-space-4, 16px);
}

.teacher-archive__filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.teacher-archive__section-tree {
  margin-top: 8px;
}

.teacher-archive__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium, 500);
}

.teacher-archive__group {
  margin-bottom: 12px;
}

.teacher-archive__group-title {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__preview-list {
  margin: 8px 0 0;
  padding-left: 18px;
}

.teacher-archive__bag p {
  margin: 0 0 var(--dp-space-2, 8px);
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-archive__hint {
  padding: var(--dp-space-6, 24px) 0;
}

@media (max-width: 1100px) {
  .teacher-archive__layout {
    grid-template-columns: 1fr;
  }
}
</style>
