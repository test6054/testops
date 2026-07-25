<script setup lang="ts">
import type { PortfolioCourseArchiveCourseVO } from '@/apis/portfolio/course-archive'
import type { PortfolioProcessSessionVO } from '@/apis/portfolio/process-session'
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
/**
 * 教学全过程过程记录：讲授课程锚定 + 课次三段（准备/过程/反馈）独立落库。
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioCourseArchiveApi } from '@/apis/portfolio/course-archive'
import { portfolioProcessSessionApi } from '@/apis/portfolio/process-session'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { PortfolioProcessSessionStatusCode } from '@/types/enums/portfolio-process-session-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

defineOptions({ name: 'PortfolioTeacherProcessJournal' })

const router = useRouter()
const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const loading = ref(false)
const sessionsLoading = ref(false)
const saving = ref(false)
const courses = ref<PortfolioCourseArchiveCourseVO[]>([])
const sessions = ref<PortfolioProcessSessionVO[]>([])
const selectedCourseId = ref<string>('')
const drawerOpen = ref(false)
const editingId = ref<string | undefined>()
const linkDrawerOpen = ref(false)
const linking = ref(false)
const linkSessionId = ref<string | undefined>()
const linkCategoryId = ref<string | undefined>()
const linkSubmitForReview = ref(true)
const categoryOptions = ref<{ value: string, label: string, code?: string }[]>([])
const categoriesLoading = ref(false)
const courseRequestToken = ref(0)
const sessionRequestToken = ref(0)
const coursesLoadFailed = ref(false)
const sessionsLoadFailed = ref(false)

/** 后端过程记录写路径仅允许教师本人；代理查看只读 */
const canManageOwnProcess = computed(() =>
  Boolean(currentUserId.value && targetTeacherId.value === currentUserId.value)
  && !archiveWriteForbidden.value,
)

const form = reactive<{
  sessionDate: string
  sessionTitle: string
  prepText: string
  processText: string
  feedbackText: string
  selectedForMasterpiece: boolean
  sessionStatus: PortfolioProcessSessionStatusCode
}>({
  sessionDate: '',
  sessionTitle: '',
  prepText: '',
  processText: '',
  feedbackText: '',
  selectedForMasterpiece: false,
  sessionStatus: PortfolioProcessSessionStatusCode.DRAFT,
})

const courseOptions = computed(() =>
  courses.value.map((item) => ({
    value: item.taughtCourseId,
    label: `${item.courseName || item.courseCode || '课程'}${
      item.academicYear ? ` · ${item.academicYear}` : ''
    }${item.semester ? ` ${item.semester}` : ''}`,
  })),
)

const selectedCourse = computed(
  () => courses.value.find((item) => item.taughtCourseId === selectedCourseId.value) ?? null,
)

const teacherQuery = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

async function loadCourses() {
  const currentToken = ++courseRequestToken.value
  if (!targetTeacherId.value && canPickTeachers.value) {
    courses.value = []
    sessions.value = []
    selectedCourseId.value = ''
    coursesLoadFailed.value = false
    sessionsLoadFailed.value = false
    return
  }
  loading.value = true
  coursesLoadFailed.value = false
  try {
    const overview = await portfolioCourseArchiveApi.overview({
      ...teacherQuery.value,
    })
    if (currentToken !== courseRequestToken.value) {
      return
    }
    courses.value = overview.courses ?? []
    if (
      selectedCourseId.value
      && !courses.value.some((item) => item.taughtCourseId === selectedCourseId.value)
    ) {
      selectedCourseId.value = ''
    }
    if (!selectedCourseId.value && courses.value.length === 1) {
      selectedCourseId.value = courses.value[0].taughtCourseId
    }
    await loadSessions()
  } catch (error) {
    if (currentToken !== courseRequestToken.value) {
      return
    }
    coursesLoadFailed.value = true
    showUserError(error, '加载讲授课程失败')
  } finally {
    if (currentToken === courseRequestToken.value) {
      loading.value = false
    }
  }
}

async function loadSessions() {
  const teacherId = targetTeacherId.value
  const taughtCourseId = selectedCourseId.value
  const currentToken = ++sessionRequestToken.value
  if (!teacherId && canPickTeachers.value) {
    sessions.value = []
    sessionsLoadFailed.value = false
    return
  }
  sessionsLoading.value = true
  sessionsLoadFailed.value = false
  try {
    const nextSessions = await portfolioProcessSessionApi.list({
      teacherId: teacherId || undefined,
      taughtCourseId: taughtCourseId || undefined,
    })
    if (
      currentToken !== sessionRequestToken.value
      || targetTeacherId.value !== teacherId
      || selectedCourseId.value !== taughtCourseId
    ) {
      return
    }
    sessions.value = nextSessions
  } catch (error) {
    if (
      currentToken !== sessionRequestToken.value
      || targetTeacherId.value !== teacherId
      || selectedCourseId.value !== taughtCourseId
    ) {
      return
    }
    sessionsLoadFailed.value = true
    showUserError(error, '加载过程记录失败')
  } finally {
    if (currentToken === sessionRequestToken.value) {
      sessionsLoading.value = false
    }
  }
}

function flattenCategories(
  nodes: PortfolioArchiveCategoryTreeNodeVO[] | undefined,
  prefix = '',
): { value: string, label: string, code?: string }[] {
  // 仅列出已发布模板的分类：租户可配类目通过档案模板治理 + 系统预置 PROCESS_SESSION
  const rows: { value: string, label: string, code?: string }[] = []
  for (const node of nodes ?? []) {
    const label = `${prefix}${node.categoryName || node.categoryCode || node.id}`
    if (node.id && node.publishedVersionId) {
      rows.push({
        value: String(node.id),
        label,
        code: node.categoryCode,
      })
    }
    if (node.children?.length) {
      rows.push(...flattenCategories(node.children, `${label} / `))
    }
  }
  return rows
}

async function loadCategories() {
  categoriesLoading.value = true
  try {
    const tree = await portfolioArchiveTemplateApi.listCategoryTree({})
    categoryOptions.value = flattenCategories(tree)
  } catch (error) {
    categoryOptions.value = []
    showUserError(error, '加载档案分类失败')
  } finally {
    categoriesLoading.value = false
  }
}

function openLinkArchive(row: PortfolioProcessSessionVO) {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  if (row.sessionStatus !== PortfolioProcessSessionStatusCode.CONFIRMED) {
    showFormValidationMessage('请先将过程记录设为「已确认」再提交材料审核')
    return
  }
  linkSessionId.value = row.id
  linkCategoryId.value = undefined
  linkSubmitForReview.value = true
  linkDrawerOpen.value = true
  void (async () => {
    if (categoryOptions.value.length === 0) {
      await loadCategories()
    }
    const processCat = categoryOptions.value.find((item) => item.code === 'PROCESS_SESSION')
    if (processCat) {
      linkCategoryId.value = processCat.value
    }
  })()
}

async function confirmLinkArchive() {
  if (!linkSessionId.value) {
    return
  }
  if (!linkCategoryId.value) {
    showFormValidationMessage('请选择目标档案分类')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite(linkSubmitForReview.value ? '提交材料审核' : '写入档案草稿'))) {
    return
  }
  linking.value = true
  try {
    const result = await portfolioProcessSessionApi.linkArchive({
      id: linkSessionId.value,
      ...teacherQuery.value,
      categoryId: linkCategoryId.value,
      submitForReview: linkSubmitForReview.value,
    })
    void message.success(
      linkSubmitForReview.value ? '已提交材料审核并回写档案关联' : '已写入档案草稿并回写关联',
    )
    linkDrawerOpen.value = false
    await loadSessions()
    if (result?.recordId) {
      void confirmAsync({
        title: '查看关联档案？',
        content: linkSubmitForReview.value
          ? '过程记录已进入材料审核队列，可打开档案详情核对。'
          : '过程记录已写入档案草稿，可继续在档案办理页完善字段后提交。',
        okText: '打开档案',
        cancelText: '留在本页',
        onOk: async () => {
          await router.push({
            path: `/portfolio/teacher/archive/${linkCategoryId.value}`,
            query: {
              ...teacherQuery.value,
              recordId: result.recordId,
            },
          })
        },
      })
    }
  } catch (error) {
    showUserError(error, '关联档案失败')
  } finally {
    linking.value = false
  }
}

async function goLinkedArchive(row: PortfolioProcessSessionVO) {
  if (!row.linkedArchiveRecordId) {
    return
  }
  try {
    const detail = await portfolioArchiveApi.getRecord(row.linkedArchiveRecordId)
    if (!detail.categoryId) {
      showFormValidationMessage('关联档案缺少分类，无法打开办理页')
      return
    }
    await router.push({
      path: `/portfolio/teacher/archive/${detail.categoryId}`,
      query: {
        ...teacherQuery.value,
        recordId: row.linkedArchiveRecordId,
      },
    })
  } catch (error) {
    showUserError(error, '打开关联档案失败')
  }
}

function goMasterpiece() {
  void router.push({
    path: '/portfolio/teacher/masterpiece',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goCourseArchive() {
  void router.push({
    path: '/portfolio/teacher/course-archive',
    query: {
      ...teacherQuery.value,
      ...(selectedCourse.value?.academicYear
        ? { academicYear: selectedCourse.value.academicYear }
        : {}),
    },
  })
}

function resetForm() {
  editingId.value = undefined
  form.sessionDate = ''
  form.sessionTitle = ''
  form.prepText = ''
  form.processText = ''
  form.feedbackText = ''
  form.selectedForMasterpiece = false
  form.sessionStatus = PortfolioProcessSessionStatusCode.DRAFT
}

function openCreate() {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  if (!selectedCourseId.value) {
    showFormValidationMessage('请先选择讲授课程')
    return
  }
  resetForm()
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  form.sessionDate = `${y}-${m}-${d}`
  form.sessionTitle = selectedCourse.value
    ? `${selectedCourse.value.courseName || '本课'} · 课次记录`
    : '课次记录'
  drawerOpen.value = true
}

function openEdit(row: PortfolioProcessSessionVO) {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  editingId.value = row.id
  form.sessionDate = row.sessionDate
  form.sessionTitle = row.sessionTitle
  form.prepText = row.prepText || ''
  form.processText = row.processText || ''
  form.feedbackText = row.feedbackText || ''
  form.selectedForMasterpiece = Boolean(row.selectedForMasterpiece)
  form.sessionStatus = row.sessionStatus || PortfolioProcessSessionStatusCode.DRAFT
  if (row.taughtCourseId) {
    selectedCourseId.value = row.taughtCourseId
  }
  drawerOpen.value = true
}

async function saveSession() {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  if (!selectedCourseId.value) {
    showFormValidationMessage('请选择讲授课程')
    return
  }
  if (!form.sessionDate || !form.sessionTitle.trim()) {
    showFormValidationMessage('请填写课次日期与标题')
    return
  }
  if (!form.prepText.trim() && !form.processText.trim() && !form.feedbackText.trim()) {
    showFormValidationMessage('课前准备、课堂过程、结果反馈至少填写一项')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite(editingId.value ? '更新过程记录' : '保存过程记录'))) {
    return
  }
  saving.value = true
  try {
    await portfolioProcessSessionApi.save({
      id: editingId.value,
      ...teacherQuery.value,
      taughtCourseId: selectedCourseId.value,
      sessionDate: form.sessionDate,
      sessionTitle: form.sessionTitle.trim(),
      prepText: form.prepText,
      processText: form.processText,
      feedbackText: form.feedbackText,
      selectedForMasterpiece: form.selectedForMasterpiece,
      sessionStatus: form.sessionStatus,
    })
    void message.success(editingId.value ? '过程记录已更新' : '过程记录已保存')
    drawerOpen.value = false
    try {
      await loadSessions()
    } catch (error) {
      showUserError(error, '保存已生效，列表同步失败')
    }
  } catch (error) {
    showUserError(error, '保存过程记录失败')
  } finally {
    saving.value = false
  }
}

async function removeSession(row: PortfolioProcessSessionVO) {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除过程记录'))) {
    return
  }
  const ok = await confirmAsync({
    title: '删除过程记录',
    content: `确认删除「${row.sessionTitle}」？删除后不可恢复。`,
  })
  if (!ok) {
    return
  }
  try {
    await portfolioProcessSessionApi.delete({
      id: row.id,
      ...teacherQuery.value,
    })
    void message.success('已删除')
    sessions.value = sessions.value.filter((item) => item.id !== row.id)
    try {
      await loadSessions()
    } catch (error) {
      showUserError(error, '删除已生效，列表同步失败')
    }
  } catch (error) {
    showUserError(error, '删除过程记录失败')
  }
}

async function toggleMasterpiece(row: PortfolioProcessSessionVO) {
  if (!canManageOwnProcess.value) {
    showFormValidationMessage('过程记录仅教师本人可写入')
    return
  }
  const next = !row.selectedForMasterpiece
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite(next ? '精选代表作' : '取消代表作精选'))) {
    return
  }
  try {
    await portfolioProcessSessionApi.setMasterpiece({
      id: row.id,
      ...teacherQuery.value,
      selectedForMasterpiece: next,
    })
    void message.success(next ? '已精选进代表作' : '已取消精选')
    await loadSessions()
  } catch (error) {
    showUserError(error, '更新代表作精选失败')
  }
}

function segmentSummary(row: PortfolioProcessSessionVO): string {
  const parts: string[] = []
  if (row.prepText?.trim()) {
    parts.push('准备')
  }
  if (row.processText?.trim()) {
    parts.push('过程')
  }
  if (row.feedbackText?.trim()) {
    parts.push('反馈')
  }
  return parts.length ? parts.join(' · ') : '未填段落'
}

usePortfolioScopedLoader(loadCourses, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教学过程记录">
        <template #actions>
          <UiButton size="sm" @click="goMasterpiece">预览代表作</UiButton>
          <UiButton size="sm" variant="outline" @click="goCourseArchive">课程档案</UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <UiAlertStrip
      v-else-if="canPickTeachers && targetTeacherId && !canManageOwnProcess"
      tone="info"
      title="代看只读"
      description="过程记录仅教师本人可写入；当前为代理查看，不提供代办写入。"
      class="mb-3"
    />

    <UiSpin :spinning="loading">
      <UiCard title="全过程过程记录">
        <p class="process-journal__lead">
          对齐清北全过程：选讲授课程 → 新建课次/阶段 → 填写课前准备 · 课堂过程 · 结果反馈 →
          独立落库；可精选进代表作第④章；确认后可关联档案分类并提交材料审核。课程五框架材料槽仍在「课程档案」维护。
        </p>

        <div class="process-journal__toolbar">
          <UiSelect
            size="sm"
            v-model="selectedCourseId"
            allow-clear
            placeholder="选择讲授课程（可空=全部）"
            style="width: 320px"
            :options="courseOptions"
            @change="loadSessions"
          />
          <UiButton
            v-if="canManageOwnProcess"
            variant="primary"
            size="sm"
            :disabled="!selectedCourseId"
            @click="openCreate"
          >
            新建课次记录
          </UiButton>
          <UiButton size="sm" variant="outline" :loading="sessionsLoading" @click="loadSessions">
            刷新
          </UiButton>
        </div>

        <UiAlertStrip
          v-if="coursesLoadFailed"
          tone="error"
          title="讲授课程加载失败"
          class="mb-3"
        />
        <UiAlertStrip
          v-else-if="!courses.length && !loading"
          tone="info"
          size="sm"
          dense
          inline
          :show-icon="false"
        >
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
              <UiTag tone="blue" size="sm">无课程</UiTag>
              <span>暂无讲授课程，请先在个人资料维护授课信息</span>
            </span>
          </template>
          <template #actions>
            <UiButton size="sm" variant="outline" @click="goCourseArchive">去课程档案</UiButton>
          </template>
        </UiAlertStrip>

        <UiSpin v-else :spinning="sessionsLoading">
          <UiAlertStrip
            v-if="sessionsLoadFailed"
            tone="error"
            title="过程记录加载失败"
            class="mb-3"
          />
          <UiEmpty
            v-else-if="!sessions.length"
            :description="canManageOwnProcess
              ? '尚无课次过程记录，点击「新建课次记录」开始短记'
              : '尚无课次过程记录'"
            size="sm"
          />
          <ul v-else class="process-journal__list">
            <li v-for="row in sessions" :key="row.id" class="process-journal__item">
              <div class="process-journal__head">
                <div>
                  <strong>{{ row.sessionTitle }}</strong>
                  <div class="process-journal__meta">
                    {{ row.sessionDate }}
                    · {{ row.courseName || row.courseCode || '课程' }}
                    <template v-if="row.academicYear"> · {{ row.academicYear }}</template>
                    <template v-if="row.semester"> {{ row.semester }}</template>
                  </div>
                </div>
                <div class="process-journal__tags">
                  <PortfolioOwnerIdentityLayersCell
                    v-if="row.ownerIdentityLayers?.length"
                    :layers="row.ownerIdentityLayers"
                    :note="row.ownerMultiIdentityNote"
                    :row-key="row.id"
                  />
                  <UiTag
                    :tone="
                      row.sessionStatus === PortfolioProcessSessionStatusCode.CONFIRMED
                        ? 'green'
                        : 'blue'
                    "
                    size="sm"
                  >
                    {{
                      row.sessionStatus === PortfolioProcessSessionStatusCode.CONFIRMED
                        ? '已确认'
                        : '草稿'
                    }}
                  </UiTag>
                  <UiTag v-if="row.selectedForMasterpiece" tone="orange" size="sm">
                    代表作精选
                  </UiTag>
                  <UiTag v-if="row.linkedArchiveRecordId" tone="green" size="sm">
                    {{ row.linkedArchiveLabel }}
                  </UiTag>
                  <UiTag tone="gray" size="sm">{{ segmentSummary(row) }}</UiTag>
                </div>
              </div>
              <div class="process-journal__preview">
                <span v-if="row.prepText">准备：{{ row.prepText.slice(0, 80) }}</span>
                <span v-if="row.processText">过程：{{ row.processText.slice(0, 80) }}</span>
                <span v-if="row.feedbackText">反馈：{{ row.feedbackText.slice(0, 80) }}</span>
              </div>
              <div class="process-journal__actions">
                <UiButton
                  v-if="row.linkedArchiveRecordId"
                  size="sm"
                  variant="outline"
                  @click="goLinkedArchive(row)"
                >
                  打开关联档案
                </UiButton>
                <UiButton
                  v-else-if="canManageOwnProcess"
                  size="sm"
                  variant="primary"
                  :disabled="row.sessionStatus !== PortfolioProcessSessionStatusCode.CONFIRMED"
                  @click="openLinkArchive(row)"
                >
                  提交材料审核
                </UiButton>
                <UiButton
                  v-if="canManageOwnProcess"
                  size="sm"
                  variant="outline"
                  @click="openEdit(row)"
                >
                  编辑
                </UiButton>
                <UiButton
                  v-if="canManageOwnProcess && row.linkedArchiveRecordId"
                  size="sm"
                  variant="ghost"
                  @click="openLinkArchive(row)"
                >
                  更新关联
                </UiButton>
                <UiButton
                  v-if="canManageOwnProcess"
                  size="sm"
                  variant="ghost"
                  @click="toggleMasterpiece(row)"
                >
                  {{ row.selectedForMasterpiece ? '取消精选' : '精选' }}
                </UiButton>
                <UiButton
                  v-if="canManageOwnProcess"
                  size="sm"
                  variant="ghost"
                  status="danger"
                  @click="removeSession(row)"
                >
                  删除
                </UiButton>
              </div>
            </li>
          </ul>
        </UiSpin>
      </UiCard>
    </UiSpin>

    <UiDrawer
      v-model:open="drawerOpen"
      :title="editingId ? '编辑课次过程记录' : '新建课次过程记录'"
      width="640"
      :hide-footer="false"
      :confirm-loading="saving"
      ok-text="保存"
      @ok="saveSession"
    >
      <UiForm layout="vertical">
        <UiFormItem label="讲授课程" required>
          <UiSelect
            size="sm"
            v-model="selectedCourseId"
            :options="courseOptions"
            placeholder="选择讲授课程"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="课次日期" required>
          <UiDatePicker
            size="sm"
            v-model="form.sessionDate"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="课次标题" required>
          <UiInput
            size="sm"
            v-model="form.sessionTitle"
            :maxlength="200"
            placeholder="如：第3周 · 项目中期检查"
          />
        </UiFormItem>
        <UiFormItem label="课前准备">
          <UiTextarea
            size="sm"
            v-model="form.prepText"
            :rows="3"
            placeholder="教学目标、材料准备、学情预判…"
          />
        </UiFormItem>
        <UiFormItem label="课堂过程">
          <UiTextarea
            size="sm"
            v-model="form.processText"
            :rows="3"
            placeholder="关键环节、互动、突发处理…"
          />
        </UiFormItem>
        <UiFormItem label="结果反馈">
          <UiTextarea
            size="sm"
            v-model="form.feedbackText"
            :rows="3"
            placeholder="课后短反思、作业反馈、改进点…"
          />
        </UiFormItem>
        <UiFormItem label="状态">
          <UiRadioGroup
            v-model="form.sessionStatus"
            size="sm"
            :options="[
              { label: '草稿', value: PortfolioProcessSessionStatusCode.DRAFT },
              { label: '已确认', value: PortfolioProcessSessionStatusCode.CONFIRMED },
            ]"
          />
        </UiFormItem>
        <UiFormItem>
          <UiCheckbox v-model="form.selectedForMasterpiece">
            精选进代表作（第④章过程记录）
          </UiCheckbox>
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="linkDrawerOpen"
      title="过程记录 → 材料审核"
      width="520"
      :hide-footer="false"
      :confirm-loading="linking"
      :ok-text="linkSubmitForReview ? '写入并提交审核' : '仅写草稿'"
      @ok="confirmLinkArchive"
    >
      <p class="process-journal__lead">
        将已确认课次三段映射到目标档案分类字段，回写关联 ID；提交后进入材料审核队列（非无感入库）。
      </p>
      <UiForm layout="vertical">
        <UiFormItem label="目标档案分类" required>
          <UiSelect
            size="sm"
            v-model="linkCategoryId"
            :options="categoryOptions"
            :loading="categoriesLoading"
            allow-search
            option-filter-prop="label"
            placeholder="选择已发布模板的档案分类"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem>
          <UiCheckbox v-model="linkSubmitForReview">
            立即提交审核（关闭则仅保存档案草稿）
          </UiCheckbox>
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.process-journal__lead {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.6;
}

.process-journal__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  margin-bottom: var(--dp-space-component);
}

.process-journal__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.process-journal__item {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.process-journal__head {
  display: flex;
  justify-content: space-between;
  gap: var(--dp-space-component);
  flex-wrap: wrap;
}

.process-journal__meta {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.process-journal__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.process-journal__preview {
  margin-top: var(--dp-space-component-tight);
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.process-journal__actions {
  margin-top: var(--dp-space-component-tight);
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
</style>
