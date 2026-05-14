<script setup lang="ts">
/**
 * 质量评价课程主数据 CRUD
 */
import type { QualityCourseQueryPayload, QualityCourseSavePayload, QualityCourseVO } from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { qualityCourseApi } from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const list = ref<QualityCourseVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<QualityCourseQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  programId: '',
  schoolYear: '',
  semester: '',
  teacherUserId: '',
  classId: '',
  enabled: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<QualityCourseSavePayload>({
  trainingPlanId: '',
  programId: '',
  courseId: '',
  courseCode: '',
  courseName: '',
  courseCategory: '',
  schoolYear: '',
  semester: '',
  teacherUserId: '',
  classId: '',
  credit: 2,
  totalHours: 32,
  civicObjective: '',
  syllabusFileId: '',
  enabled: true,
  remark: '',
})
const submitting = ref(false)

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await qualityCourseApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      programId: query.programId?.trim() || undefined,
      schoolYear: query.schoolYear?.trim() || undefined,
      semester: query.semester?.trim() || undefined,
      teacherUserId: query.teacherUserId?.trim() || undefined,
      classId: query.classId?.trim() || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  Object.assign(query, { programId: '', schoolYear: '', semester: '', teacherUserId: '', classId: '', enabled: undefined, keyword: '' })
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    programId: '',
    courseId: '',
    courseCode: '',
    courseName: '',
    courseCategory: '',
    schoolYear: '',
    semester: '',
    teacherUserId: '',
    classId: '',
    credit: 2,
    totalHours: 32,
    civicObjective: '',
    syllabusFileId: '',
    enabled: true,
    remark: '',
  })
  editorVisible.value = true
}

function openEdit(record: QualityCourseVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.trainingPlanId || !editor.programId || !editor.courseId || !editor.courseCode || !editor.courseName) {
    message.error('请填写培养方案 / 专业 / 课程主键 / 编码 / 名称')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await qualityCourseApi.create(editor)
    else await qualityCourseApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  }
  finally {
    submitting.value = false
  }
}

async function handleDelete(record: QualityCourseVO) {
  Modal.confirm({
    title: `删除质量评价课程 ${record.courseCode}？`,
    okType: 'danger',
    onOk: async () => {
      await qualityCourseApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function selectAsCurrent(record: QualityCourseVO) {
  qualityStore.setCurrent({ qualityCourseId: record.id, schoolYear: record.schoolYear, semester: record.semester })
  message.success(`已切换当前课程为 ${record.courseCode}`)
}

watch(() => qualityStore.currentTrainingPlanId, () => loadList())
onMounted(loadList)
</script>

<template>
  <div class="page">
    <a-card title="质量评价课程" :bordered="false">
      <template #extra>
        <a-space>
          <a-input v-model:value="query.programId" placeholder="专业 ID" style="width: 110px" />
          <a-input v-model:value="query.schoolYear" placeholder="学年" style="width: 110px" />
          <a-input v-model:value="query.semester" placeholder="学期" style="width: 70px" />
          <a-input v-model:value="query.teacherUserId" placeholder="教师 user_id" style="width: 130px" />
          <a-input v-model:value="query.classId" placeholder="班级 ID" style="width: 110px" />
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 140px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" :disabled="!qualityStore.currentTrainingPlanId" @click="openCreate">
            新建课程
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="编码" data-index="courseCode" width="140" />
        <a-table-column title="名称" data-index="courseName" />
        <a-table-column title="类别" data-index="courseCategory" width="100" />
        <a-table-column title="学年/学期" width="120">
          <template #default="{ record }">
            {{ record.schoolYear || '-' }} / {{ record.semester || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="学分/学时" width="100">
          <template #default="{ record }">
            {{ record.creditValue ?? '-' }} / {{ record.creditHours ?? '-' }}
          </template>
        </a-table-column>
        <a-table-column title="教师" data-index="teacherUserId" width="120" />
        <a-table-column title="状态" data-index="enabled" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="220" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="selectAsCurrent(record)">
                设为当前课程
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建质量评价课程' : '编辑质量评价课程'"
      :confirm-loading="submitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="专业 ID" required>
              <a-input v-model:value="editor.programId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="edu-user 课程 ID" required>
              <a-input v-model:value="editor.courseId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="课程编码" required>
              <a-input v-model:value="editor.courseCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="课程名称" required>
              <a-input v-model:value="editor.courseName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="课程类别">
              <a-input v-model:value="editor.courseCategory" placeholder="必修 / 选修 / 实践" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学年">
              <a-input v-model:value="editor.schoolYear" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学期">
              <a-input v-model:value="editor.semester" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="任课教师 user_id">
              <a-input v-model:value="editor.teacherUserId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="授课班级 ID">
              <a-input v-model:value="editor.classId" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="学分">
              <a-input-number v-model:value="editor.creditValue" :min="0" :step="0.5" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="学时">
              <a-input-number v-model:value="editor.creditHours" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="课程思政目标">
          <a-textarea v-model:value="editor.civicObjective" :rows="2" />
        </a-form-item>
        <a-form-item label="课程大纲文件 ID">
          <a-input v-model:value="editor.syllabusFileId" />
        </a-form-item>
        <a-form-item label="是否启用">
          <a-switch v-model:checked="editor.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
