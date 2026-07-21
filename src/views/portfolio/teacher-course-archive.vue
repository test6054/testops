<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioCourseArchiveCourseVO,
  PortfolioCourseArchiveFrameworkVO,
} from '@/apis/portfolio/course-archive'
import type { PortfolioTeacherCustomCategoryVO } from '@/apis/portfolio/teacher-custom-category'
import type {
  PortfolioMultiIdentityLayerVO,
  PortfolioTeachingWorkloadByIdentityVO,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioCourseArchiveApi } from '@/apis/portfolio/course-archive'
import { portfolioTeacherCustomCategoryApi } from '@/apis/portfolio/teacher-custom-category'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const router = useRouter()
const route = useRoute()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  evaluationHeld,
  evaluationHoldBlockMessage,
  lifecycleStatusLabel,
} = usePortfolioArchiveWriteGuard()

/** 课程档案概览返回的生命周期结构态（与写禁 guard 双源对齐展示）。 */
const overviewLifecycle = ref<{
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
}>({})

const loading = ref(false)
const customLoading = ref(false)
const creating = ref(false)
const deletingCategoryId = ref('')
const loadFailed = ref(false)
const courses = ref<PortfolioCourseArchiveCourseVO[]>([])
const overviewSummary = ref({
  taughtCourseCount: 0,
  fullyCompleteCourseCount: 0,
  frameworkSlotDone: 0,
  frameworkSlotTotal: 0,
})
const identityLayers = ref<PortfolioMultiIdentityLayerVO[]>([])
const multiIdentityNotes = ref<string[]>([])
const teachingWorkload = ref<PortfolioTeachingWorkloadByIdentityVO | null>(null)
const customCategories = ref<PortfolioTeacherCustomCategoryVO[]>([])
const customModalOpen = ref(false)
const customForm = reactive({ categoryName: '' })
const academicYearFilter = ref('')
const highlightCourseCode = ref('')
const semesterFilter = ref('')
const overviewRequestToken = ref(0)

const readonlyMode = computed(
  () => (canPickTeachers.value && !!targetTeacherId.value) || archiveWriteForbidden.value,
)

const displayedCourses = computed(() => {
  const code = highlightCourseCode.value.trim()
  const semester = semesterFilter.value.trim()
  return courses.value.filter((item) => {
    if (code && item.courseCode !== code) {
      return false
    }
    return !(semester && item.semester !== semester)
  })
})

const courseColumns: ColumnsType = [
  { title: '课程编码', dataIndex: 'courseCode', key: 'courseCode', width: 120 },
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 110 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 72 },
  { title: '身份口径', key: 'identityScope', width: 96 },
  { title: '框架完成', key: 'progress', width: 120 },
]

const frameworkColumns: ColumnsType = [
  { title: '框架', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '状态', key: 'completed', width: 96 },
  { title: '更新时间', dataIndex: 'latestUpdateTime', key: 'latestUpdateTime', width: 168 },
  { title: '操作', key: 'actions', width: 88 },
]

const customColumns: ColumnsType = [
  { title: '分类名称', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 180 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 168 },
  { title: '操作', key: 'actions', width: 140 },
]

/** 路由 query 决定课程档案上下文；缺省时也必须清空旧筛选，避免复用页残留。 */
function applyRouteQueryFilters() {
  academicYearFilter.value
    = typeof route.query.academicYear === 'string' ? route.query.academicYear : ''
  highlightCourseCode.value
    = typeof route.query.courseCode === 'string' ? route.query.courseCode : ''
  semesterFilter.value = typeof route.query.semester === 'string' ? route.query.semester : ''
}

applyRouteQueryFilters()

function scopeTeacherId() {
  return targetTeacherId.value || undefined
}

/** 教师或筛选范围变化时先失效旧请求，避免旧课程/自建分类覆盖当前页。 */
function resetOverviewContext() {
  courses.value = []
  customCategories.value = []
  overviewSummary.value = {
    taughtCourseCount: 0,
    fullyCompleteCourseCount: 0,
    frameworkSlotDone: 0,
    frameworkSlotTotal: 0,
  }
  identityLayers.value = []
  overviewLifecycle.value = {}
  multiIdentityNotes.value = []
  teachingWorkload.value = null
  loadFailed.value = false
}

async function loadOverview() {
  const currentToken = ++overviewRequestToken.value
  if (canPickTeachers.value && !targetTeacherId.value) {
    resetOverviewContext()
    loading.value = false
    customLoading.value = false
    return
  }
  resetOverviewContext()
  loading.value = true
  customLoading.value = true
  loadFailed.value = false
  try {
    const overview = await portfolioCourseArchiveApi.overview({
      teacherId: scopeTeacherId(),
      academicYear: academicYearFilter.value.trim() || undefined,
    })
    if (currentToken !== overviewRequestToken.value) {
      return
    }
    courses.value = overview.courses ?? []
    overviewSummary.value = {
      taughtCourseCount: overview.taughtCourseCount ?? 0,
      fullyCompleteCourseCount: overview.fullyCompleteCourseCount ?? 0,
      frameworkSlotDone: overview.frameworkSlotDone ?? 0,
      frameworkSlotTotal: overview.frameworkSlotTotal ?? 0,
    }
    identityLayers.value = overview.identityLayers ?? []
    multiIdentityNotes.value = overview.multiIdentityNotes ?? []
    teachingWorkload.value = overview.teachingWorkloadByIdentity ?? null
    overviewLifecycle.value = {
      lifecycleStatus: overview.lifecycleStatus,
      lifecycleStatusLabel: overview.lifecycleStatusLabel,
      archiveWriteForbidden: overview.archiveWriteForbidden,
      evaluationHeld: overview.evaluationHeld,
      countsInCurrentFacultyStructure: overview.countsInCurrentFacultyStructure,
    }
    try {
      const customList = await portfolioTeacherCustomCategoryApi.list({
        teacherId: scopeTeacherId(),
      })
      if (currentToken === overviewRequestToken.value) {
        customCategories.value = customList ?? []
      }
    } catch (error) {
      if (currentToken === overviewRequestToken.value) {
        customCategories.value = []
        showUserError(error, '自建分类加载失败')
      }
    }
  } catch (error) {
    if (currentToken !== overviewRequestToken.value) {
      return
    }
    loadFailed.value = true
    showUserError(error, '加载课程档案概览失败')
  } finally {
    if (currentToken === overviewRequestToken.value) {
      loading.value = false
      customLoading.value = false
    }
  }
}

function progressText(row: PortfolioCourseArchiveCourseVO) {
  return `${row.completedFrameworkCount}/${row.totalFrameworkCount}`
}

function openFrameworkIntake(
  course: PortfolioCourseArchiveCourseVO,
  framework: PortfolioCourseArchiveFrameworkVO,
) {
  const query: Record<string, string> = {}
  if (scopeTeacherId()) {
    query.teacherId = scopeTeacherId()!
  }
  query.fromPage = 'courseArchive'
  query.courseCode = course.courseCode
  if (course.academicYear) {
    query.academicYear = course.academicYear
  }
  if (course.semester) {
    query.semester = course.semester
  }
  void router.push({ path: `/portfolio/teacher/archive/${framework.categoryId}`, query })
}

function openCustomCategoryArchive(row: PortfolioTeacherCustomCategoryVO) {
  const query: Record<string, string> = {}
  if (scopeTeacherId()) {
    query.teacherId = scopeTeacherId()!
  }
  void router.push({ path: `/portfolio/teacher/archive/${row.categoryId}`, query })
}

function openCustomModal() {
  if (readonlyMode.value) {
    showFormValidationMessage('管理员查看模式下不可创建分类')
    return
  }
  customForm.categoryName = ''
  customModalOpen.value = true
}

async function createCustomCategory() {
  if (!customForm.categoryName.trim()) {
    showFormValidationMessage('请填写分类名称')
    return
  }
  if (creating.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('创建课程档案自建分类'))) {
    return
  }

  creating.value = true
  try {
    await portfolioTeacherCustomCategoryApi.create({
      categoryName: customForm.categoryName.trim(),
    })
    void message.success('自建分类已创建')
    customModalOpen.value = false
    await loadOverview()
  } catch (error) {
    showUserError(error, '创建自建分类失败')
  } finally {
    creating.value = false
  }
}

async function confirmDeleteCustomCategory(row: PortfolioTeacherCustomCategoryVO) {
  if (readonlyMode.value) {
    showFormValidationMessage('管理员查看模式下不可删除分类')
    return
  }
  if (deletingCategoryId.value) return

  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除课程档案自建分类'))) {
    return
  }
  const categoryId = row.categoryId
  const scopeToken = overviewRequestToken.value
  deletingCategoryId.value = categoryId
  const confirmed = await confirmAsync({
    title: '删除自建分类',
    content: `确认删除「${row.categoryName}」？分类下已有档案记录时无法删除。`,
    type: 'error',
    okText: '确认删除',
  })
  if (!confirmed || overviewRequestToken.value !== scopeToken) {
    if (deletingCategoryId.value === categoryId) deletingCategoryId.value = ''
    return
  }
  try {
    await portfolioTeacherCustomCategoryApi.delete({ categoryId })
    if (overviewRequestToken.value !== scopeToken) return
    void message.success('自建分类已删除')
    await loadOverview()
  } catch (error) {
    if (overviewRequestToken.value !== scopeToken) return
    showUserError(error, '删除自建分类失败')
  } finally {
    if (deletingCategoryId.value === categoryId) deletingCategoryId.value = ''
  }
}

usePortfolioScopedLoader(loadOverview, () => targetTeacherId.value)

watch(
  () => [route.query.academicYear, route.query.courseCode, route.query.semester],
  () => {
    applyRouteQueryFilters()
    resetOverviewContext()
    void loadOverview()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="课程档案"
        subtitle="按讲授课程查看五框架完成度"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <UiAlertStrip
      v-else-if="evaluationHeld || overviewLifecycle.evaluationHeld"
      tone="warning"
      title="评价参评 hold"
      :description="
        evaluationHoldBlockMessage
          || '当前教师处于参评 hold（如暂挂），档案可填报但不可参与进行中评价。'
      "
      class="mb-3"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <UiCard v-else-if="loadFailed" title="加载失败">
      <UiEmpty size="sm" description="课程档案加载失败">
        <UiButton size="sm" variant="primary" @click="loadOverview">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard v-if="overviewSummary.taughtCourseCount > 0" title="本学年课程档案概览">
        <p class="course-archive__summary">
          讲授 {{ overviewSummary.taughtCourseCount }} 门 · 五框架齐备
          {{ overviewSummary.fullyCompleteCourseCount }} 门 · 槽位完成
          {{ overviewSummary.frameworkSlotDone }}/{{ overviewSummary.frameworkSlotTotal }}
        </p>
        <div
          v-if="overviewLifecycle.lifecycleStatus || lifecycleStatusLabel"
          class="course-archive__lifecycle"
        >
          <UiTag
            v-if="overviewLifecycle.lifecycleStatus || lifecycleStatusLabel"
            :tone="overviewLifecycle.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'"
          >
            {{
              overviewLifecycle.lifecycleStatusLabel
                || lifecycleStatusLabel
                || overviewLifecycle.lifecycleStatus
            }}
          </UiTag>
          <UiTag
            v-if="overviewLifecycle.evaluationHeld || evaluationHeld"
            tone="orange"
            class="ml-1"
          >
            参评 hold
          </UiTag>
          <UiTag
            v-if="overviewLifecycle.archiveWriteForbidden || archiveWriteForbidden"
            tone="red"
            class="ml-1"
          >
            档案写禁
          </UiTag>
          <UiTag
            v-if="overviewLifecycle.countsInCurrentFacultyStructure === false"
            tone="gray"
            class="ml-1"
          >
            不计入在岗结构
          </UiTag>
        </div>
        <div v-if="teachingWorkload" class="course-archive__workload">
          <span>校内学时 {{ teachingWorkload.campusWorkloadHours ?? 0 }}</span>
          <span> · 外部学时 {{ teachingWorkload.externalWorkloadHours ?? 0 }}</span>
          <span> · 覆盖课程 {{ teachingWorkload.coveredCourseCount ?? 0 }} 门（按课去重）</span>
        </div>
        <div v-if="identityLayers.length" class="course-archive__identity-layers">
          <UiTag
            v-for="(layer, idx) in identityLayers"
            :key="layer.identityId || `${layer.identityType}-${idx}`"
            :tone="layer.externalIdentity ? 'orange' : 'blue'"
            style="margin-right: 8px; margin-top: 8px"
          >
            {{ layer.identityTypeLabel || layer.displayName }} · {{ layer.workloadHours ?? 0 }} 学时
          </UiTag>
        </div>
        <p
          v-for="(note, idx) in multiIdentityNotes"
          :key="`mi-note-${idx}`"
          class="course-archive__note"
        >
          {{ note }}
        </p>
      </UiCard>

      <UiCard title="讲授课程 · 五框架" :loading="loading" style="margin-top: 16px">
        <template #extra>
          <UiInput
            v-model="academicYearFilter"
            size="sm"
            clearable
            placeholder="学年筛选 如 2025-2026"
            style="width: 180px"
            @enter="loadOverview"
          />
          <UiSelect
            size="sm"
            v-model="semesterFilter"
            allow-clear
            placeholder="学期"
            style="width: 120px; margin-left: 8px"
            :options="SemesterOptions"
          />
          <UiButton size="sm" style="margin-left: 8px" @click="loadOverview">筛选</UiButton>
        </template>
        <UiDataTable
          :columns="courseColumns"
          :data-source="displayedCourses"
          row-key="taughtCourseId"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityScope'">
              <UiTag tone="blue">{{ record.identityScope || 'CAMPUS' }}</UiTag>
            </template>
            <template v-if="column.key === 'progress'">
              <UiTag
                :tone="
                  record.completedFrameworkCount === record.totalFrameworkCount ? 'green' : 'yellow'
                "
              >
                {{ progressText(record) }}
              </UiTag>
            </template>
          </template>
          <template #expandedRowRender="{ record }">
            <UiDataTable
              :columns="frameworkColumns"
              :data-source="record.frameworks"
              row-key="categoryId"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record: framework }">
                <template v-if="column.key === 'completed'">
                  <UiTag :tone="framework.completed ? 'green' : 'gray'">
                    {{ framework.completed ? '已完成' : '待填报' }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiButton
                    size="sm"
                    variant="ghost"
                    @click="openFrameworkIntake(record, framework)"
                  >
                    {{ framework.completed ? '查看' : '填报' }}
                  </UiButton>
                </template>
              </template>
            </UiDataTable>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard title="框架外自建分类" :loading="customLoading" style="margin-top: 16px">
        <template #extra>
          <UiButton size="sm" variant="primary" v-if="!readonlyMode" @click="openCustomModal">
            新建分类
          </UiButton>
        </template>
        <UiDataTable
          :columns="customColumns"
          :data-source="customCategories"
          row-key="categoryId"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <UiButton size="sm" variant="ghost" @click="openCustomCategoryArchive(record)">
                进入档案
              </UiButton>
              <UiButton
                size="sm"
                v-if="!readonlyMode"
                variant="ghost"
                danger
                :loading="deletingCategoryId === record.categoryId"
                @click="confirmDeleteCustomCategory(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <UiDialog
    v-model:open="customModalOpen"
    title="新建框架外分类"
    :confirm-loading="creating"
    @ok="createCustomCategory"
  >
    <UiForm layout="vertical">
      <UiFormItem label="分类名称" required compact>
        <UiInput v-model="customForm.categoryName" size="sm" placeholder="如 教学竞赛材料" />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

<style scoped>
.course-archive__summary {
  margin: 0;
  font-size: 14px;
  color: var(--dp-text-secondary);
}
.course-archive__workload {
  margin-top: 8px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.course-archive__identity-layers {
  margin-top: 4px;
}
.course-archive__note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--dp-text-tertiary, var(--dp-text-secondary));
}
</style>
