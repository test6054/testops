<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioCourseArchiveCourseVO,
  PortfolioCourseArchiveFrameworkVO,
} from '@/apis/portfolio/course-archive'
import type { PortfolioTeacherCustomCategoryVO } from '@/apis/portfolio/teacher-custom-category'
import { Form, Input, message, Modal } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioCourseArchiveApi } from '@/apis/portfolio/course-archive'
import { portfolioTeacherCustomCategoryApi } from '@/apis/portfolio/teacher-custom-category'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'

const router = useRouter()
const route = useRoute()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const customLoading = ref(false)
const creating = ref(false)
const deletingCategoryId = ref('')
const loadFailed = ref(false)
const courses = ref<PortfolioCourseArchiveCourseVO[]>([])
const customCategories = ref<PortfolioTeacherCustomCategoryVO[]>([])
const customModalOpen = ref(false)
const customForm = reactive({ categoryName: '' })
const academicYearFilter = ref('')
const highlightCourseCode = ref('')
const semesterFilter = ref('')
const overviewRequestToken = ref(0)

const readonlyMode = computed(() => canPickTeachers.value && !!targetTeacherId.value)

const displayedCourses = computed(() => {
  const code = highlightCourseCode.value.trim()
  const semester = semesterFilter.value.trim()
  return courses.value.filter((item) => {
    if (code && item.courseCode !== code) {
      return false
    }
    return !(semester && item.semester !== semester);
  })
})

const courseColumns: ColumnsType = [
  { title: '课程编码', dataIndex: 'courseCode', key: 'courseCode', width: 120 },
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 110 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 72 },
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
  loading.value = true
  customLoading.value = true
  loadFailed.value = false
  try {
    const [overview, customList] = await Promise.all([
      portfolioCourseArchiveApi.overview({
        teacherId: scopeTeacherId(),
        academicYear: academicYearFilter.value.trim() || undefined,
      }),
      portfolioTeacherCustomCategoryApi.list({ teacherId: scopeTeacherId() }),
    ])
    if (currentToken !== overviewRequestToken.value) {
      return
    }
    courses.value = overview.courses ?? []
    customCategories.value = customList ?? []
  } catch (error) {
    if (currentToken !== overviewRequestToken.value) {
      return
    }
    loadFailed.value = true
    showUserError(error)
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
    message.warning('管理员查看模式下不可创建分类')
    return
  }
  customForm.categoryName = ''
  customModalOpen.value = true
}

async function createCustomCategory() {
  creating.value = true
  try {
    await portfolioTeacherCustomCategoryApi.create({
      categoryName: customForm.categoryName.trim(),
    })
    message.success('自建分类已创建')
    customModalOpen.value = false
    await loadOverview()
  } catch (error) {
    showUserError(error)
  } finally {
    creating.value = false
  }
}

function confirmDeleteCustomCategory(row: PortfolioTeacherCustomCategoryVO) {
  if (readonlyMode.value) {
    message.warning('管理员查看模式下不可删除分类')
    return
  }
  Modal.confirm({
    title: '删除自建分类',
    content: `确认删除「${row.categoryName}」？分类下已有档案记录时无法删除。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      deletingCategoryId.value = row.categoryId
      try {
        await portfolioTeacherCustomCategoryApi.delete({ categoryId: row.categoryId })
        message.success('自建分类已删除')
        await loadOverview()
      } catch (error) {
        showUserError(error)
      } finally {
        deletingCategoryId.value = ''
      }
    },
  })
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

    <UiCard v-if="loadFailed" title="加载失败">
      <UiEmpty description="课程档案加载失败">
        <UiButton @click="loadOverview">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard title="讲授课程 · 五框架" :loading="loading">
        <template #extra>
          <Input
            v-model:value="academicYearFilter"
            allow-clear
            placeholder="学年筛选 如 2025-2026"
            style="width: 180px"
            @press-enter="loadOverview"
          />
          <a-select
            v-model:value="semesterFilter"
            allow-clear
            placeholder="学期"
            style="width: 120px; margin-left: 8px"
            :options="SemesterOptions"
          />
          <UiButton style="margin-left: 8px" @click="loadOverview">筛选</UiButton>
        </template>
        <UiDataTable
          :columns="courseColumns"
          :data-source="displayedCourses"
          row-key="taughtCourseId"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
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
                  <UiButton variant="ghost" @click="openFrameworkIntake(record, framework)">
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
          <UiButton v-if="!readonlyMode" @click="openCustomModal">新建分类</UiButton>
        </template>
        <UiDataTable
          :columns="customColumns"
          :data-source="customCategories"
          row-key="categoryId"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <UiButton variant="ghost" @click="openCustomCategoryArchive(record)">
                进入档案
              </UiButton>
              <UiButton
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

  <a-modal
    v-model:open="customModalOpen"
    title="新建框架外分类"
    :confirm-loading="creating"
    @ok="createCustomCategory"
  >
    <Form layout="vertical">
      <Form.Item label="分类名称" required>
        <Input v-model:value="customForm.categoryName" placeholder="如 教学竞赛材料" />
      </Form.Item>
    </Form>
  </a-modal>
</template>
