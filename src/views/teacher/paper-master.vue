<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="paper-master-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag
            v-if="masterData"
            :tone="masterData.status === 'ACTIVE' ? 'green' : 'gray'"
            size="sm"
          >
            {{ masterData.status === 'ACTIVE' ? '已生效' : '草稿' }}
          </UiTag>
          <UiTag v-if="masterData" :tone="pageTemplateReady ? 'green' : 'orange'" size="sm">
            {{ pageTemplateReady ? `${examTotalPages ?? 0} 页已同步` : '拆页待同步' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="primary" :disabled="!selectedExamId" :loading="generating" @click="openGenerateModal">
            <template #icon><ThunderboltOutlined /></template>
            生成标准试卷
          </UiButton>
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存母版
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择需要维护母版的考试"
      class="paper-master-page__empty"
    />

    <!-- D-9 错误态：试卷母版加载遇到非“未配置”错误时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="masterLoadError"
      :error="masterLoadError"
      title="试卷母版加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadMasterData"
    />

    <a-spin v-else :spinning="loading">
      <!-- PDF 预览/编辑区 -->
      <UiCard v-if="form.masterFileId" class="preview-card">
        <template #title>
          <EyeOutlined />
          <span>母版 PDF</span>
          <a-segmented
            v-model:value="pdfViewMode"
            :options="[
              { label: '预览', value: 'preview' },
              { label: '在线编辑', value: 'edit' },
            ]"
            size="small"
            style="margin-left: 12px"
          />
        </template>
        <template #extra>
          <a-button v-if="pdfPreviewUrl" type="link" size="small" @click="openPdfInNewTab">
            新窗口打开
          </a-button>
          <UiTextAction @click="closePdfPreview">关闭预览</UiTextAction>
        </template>
        <!-- 预览模式 -->
        <template v-if="pdfViewMode === 'preview'">
          <a-spin :spinning="pdfPreviewLoading">
            <iframe v-if="pdfPreviewUrl" :src="pdfPreviewUrl" class="pdf-iframe" />
            <div v-else class="pdf-placeholder">正在加载 PDF…</div>
          </a-spin>
        </template>
        <!-- 编辑模式 -->
        <PdfAnnotationEditor
          v-else
          :pdf-file-id="form.masterFileId"
          @saved="onPdfSaved"
        />
      </UiCard>

      <!-- 基本信息 -->
      <UiCard class="info-card">
        <template #title>
          <FileTextOutlined />
          <span>母版基本信息</span>
        </template>
        <a-form layout="inline">
          <a-form-item label="母版名称" required>
            <a-input
              v-model:value="form.masterName"
              placeholder="例如：2026 春《工程制图》期末母版"
              :maxlength="100"
              style="width: 360px"
            />
          </a-form-item>
          <a-form-item label="母版 PDF">
            <a-upload :before-upload="handleBeforeUpload" :show-upload-list="false" accept=".pdf">
              <UiButton size="sm" :loading="uploading">
                <template #icon><UploadOutlined /></template>
                {{ form.masterFileId ? '重新上传' : '上传 PDF' }}
              </UiButton>
            </a-upload>
            <span v-if="uploadedFileName" class="uploaded-hint">{{ uploadedFileName }}</span>
            <UiButton
              v-if="form.masterFileId"
              size="sm"
              style="margin-left: 8px"
              @click="previewPdf"
            >
              <template #icon><EyeOutlined /></template>
              预览
            </UiButton>
          </a-form-item>
          <a-form-item label="防伪水印">
            <a-input
              v-model:value="form.watermarkText"
              placeholder="可选，印刷在每页的水印文字"
              :maxlength="200"
              style="width: 280px"
            />
          </a-form-item>
        </a-form>
      </UiCard>

      <!-- 主观题区域（只读，编辑入口在试卷题目页） -->
      <UiCard class="area-card">
        <template #title>
          <ProfileOutlined />
          <span>主观题区域（{{ subjectiveQuestions.length }}）</span>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" @click="goPaperTemplate">去题目页编辑</UiButton>
        </template>
        <UiDataTable
          class="student-detail-table__data-table"
          :columns="subjectiveColumns"
          :data-source="subjectiveQuestions"
          :show-pagination="false"
          flat
          :total="subjectiveQuestions.length"
          row-key="questionTemplateId"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'region'">
              <span v-if="record.pageNo && record.width && record.height">
                P{{ record.pageNo }} · {{ record.x }},{{ record.y }} · {{ record.width }}×{{
                  record.height
                }}
              </span>
              <UiTag v-else tone="orange" size="sm">未配置</UiTag>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- 身份填涂区 -->
      <UiCard class="area-card">
        <template #title>
          <ProfileOutlined />
          <span>身份填涂区（{{ identityAreas.length }}）</span>
        </template>
        <template #extra>
          <UiButton size="sm" @click="addIdentityArea">
            <template #icon><PlusOutlined /></template>
            新增
          </UiButton>
        </template>
        <UiDataTable
          class="student-detail-table__data-table"
          :columns="identityColumns"
          :data-source="identityAreas"
          :show-pagination="false"
          flat
          :total="identityAreas.length"
          row-key="rowKey"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'areaType'">
              {{ formatIdentityType(record.areaType) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <UiTextAction @click="openIdentityEdit(index)">编辑</UiTextAction>
                <UiConfirmPopover
                  title="确认删除该身份识别区？"
                  description="删除后需重新配置并保存母版。"
                  danger
                  @confirm="removeIdentityArea(index)"
                >
                  <UiTextAction tone="danger">删除</UiTextAction>
                </UiConfirmPopover>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- 客观题填涂区 -->
      <UiCard class="area-card">
        <template #title>
          <ProfileOutlined />
          <span>客观题填涂区（{{ objectiveAreas.length }}）</span>
        </template>
        <template #extra>
          <UiButton size="sm" @click="addObjectiveArea">
            <template #icon><PlusOutlined /></template>
            新增
          </UiButton>
        </template>
        <UiDataTable
          class="student-detail-table__data-table"
          :columns="objectiveColumns"
          :data-source="objectiveAreas"
          :show-pagination="false"
          flat
          :total="objectiveAreas.length"
          row-key="rowKey"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'questionTemplateId'">
              {{ resolveQuestionLabel(record.questionTemplateId) }}
            </template>
            <template v-else-if="column.key === 'optionsSummary'">
              <UiTag size="sm" tone="blue">{{ record.options.length }} 项</UiTag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <UiTextAction @click="openObjectiveEdit(index)">编辑</UiTextAction>
                <UiConfirmPopover
                  title="确认删除该客观题填涂区？"
                  description="删除后需重新配置并保存母版。"
                  danger
                  @confirm="removeObjectiveArea(index)"
                >
                  <UiTextAction tone="danger">删除</UiTextAction>
                </UiConfirmPopover>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <a-modal
        v-model:open="identityEditOpen"
        :title="identityEditIndex === null ? '新增身份填涂区' : '编辑身份填涂区'"
        :destroy-on-close="true"
        :mask-closable="false"
        width="520px"
        @ok="handleIdentityEditOk"
      >
        <a-form layout="vertical">
          <a-form-item label="区域类型" required>
            <a-select v-model:value="identityDraft.areaType" :options="identityAreaTypeOptions" />
          </a-form-item>
          <a-form-item label="页号" required>
            <a-input-number
              v-model:value="identityDraft.pageNo"
              :min="1"
              :max="99"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="X">
            <a-input-number v-model:value="identityDraft.x" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="Y">
            <a-input-number v-model:value="identityDraft.y" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="宽">
            <a-input-number v-model:value="identityDraft.width" :min="1" style="width: 100%" />
          </a-form-item>
          <a-form-item label="高">
            <a-input-number v-model:value="identityDraft.height" :min="1" style="width: 100%" />
          </a-form-item>
          <a-form-item label="填涂格数">
            <a-input-number
              v-model:value="identityDraft.fillCellCount"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-form>
      </a-modal>

      <a-modal
        v-model:open="objectiveEditOpen"
        :title="objectiveEditIndex === null ? '新增客观题填涂区' : '编辑客观题填涂区'"
        :destroy-on-close="true"
        :mask-closable="false"
        width="560px"
        @ok="handleObjectiveEditOk"
      >
        <a-form layout="vertical">
          <a-form-item label="题目" required>
            <a-select
              v-model:value="objectiveDraft.questionTemplateId"
              :options="questionOptions"
              :loading="questionsLoading"
              show-search
              option-filter-prop="label"
            />
          </a-form-item>
          <a-form-item label="页号" required>
            <a-input-number
              v-model:value="objectiveDraft.pageNo"
              :min="1"
              :max="99"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="X">
            <a-input-number v-model:value="objectiveDraft.x" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="Y">
            <a-input-number v-model:value="objectiveDraft.y" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="框宽">
            <a-input-number v-model:value="objectiveDraft.boxWidth" :min="1" style="width: 100%" />
          </a-form-item>
          <a-form-item label="框高">
            <a-input-number v-model:value="objectiveDraft.boxHeight" :min="1" style="width: 100%" />
          </a-form-item>
          <a-form-item label="选项">
            <div
              v-for="option in objectiveDraft.options"
              :key="option.sortNo"
              class="objective-options__item"
            >
              <a-input v-model:value="option.optionLabel" :maxlength="8" size="small" />
              <UiTextAction tone="danger" @click="removeObjectiveOption(objectiveDraft, option.sortNo)">
                删除
              </UiTextAction>
            </div>
            <a-button size="small" type="link" @click="addObjectiveOption(objectiveDraft)">
              添加选项
            </a-button>
          </a-form-item>
        </a-form>
      </a-modal>
    </a-spin>

    <!-- 生成标准试卷配置弹窗 -->
    <a-modal
      v-model:open="generateModalOpen"
      title="生成标准试卷 PDF"
      width="560px"
      :confirm-loading="generating"
      ok-text="生成并预览"
      @ok="handleGenerate"
    >
      <a-form layout="vertical">
        <a-form-item label="学校名称" required>
          <a-input v-model:value="genForm.universityName" placeholder="例如：XX大学" />
        </a-form-item>
        <a-form-item label="学年">
          <a-input v-model:value="genForm.academicYear" placeholder="例如：2025-2026" />
        </a-form-item>
        <a-form-item label="学期">
          <a-select
            v-model:value="genForm.semester" :options="[
              { label: '秋季学期', value: '1' },
              { label: '春季学期', value: '2' },
            ]"
          />
        </a-form-item>
        <a-form-item label="课程名称" required>
          <a-input v-model:value="genForm.courseName" placeholder="课程名称" />
        </a-form-item>
        <a-form-item label="考试形式">
          <a-select
            v-model:value="genForm.examType" :options="[
              { label: '闭卷', value: '闭卷' }, { label: '开卷', value: '开卷' },
            ]"
          />
        </a-form-item>
        <a-form-item label="考试时间（分钟）">
          <a-input-number v-model:value="genForm.durationMin" :min="30" :max="300" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import type {
  PaperMasterIdentityAreaRequest,
  PaperMasterIdentityAreaTypeCode,
  PaperMasterObjectiveAreaRequest,
  PaperMasterVO
} from '@/apis/mark/paper-master'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getFileArrayBuffer, uploadFile } from '@/apis/edu/file-management'
import { getExamDetail, getExamTemplate } from '@/apis/mark/exam'
import {
  generateStandardPaper,
  getPaperMaster,
  isPaperMasterNotConfiguredError,
  PAPER_MASTER_IDENTITY_AREA_TYPE_LABEL,
  savePaperMaster
} from '@/apis/mark/paper-master'
import PdfAnnotationEditor from '@/components/mark/PdfAnnotationEditor.vue'
import { UiButton, UiCard, UiConfirmPopover, UiDataTable, UiEmpty, UiErrorRetryPanel, UiTag, UiTextAction } from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { showUserError, toUserError } from '@/utils/error-handler'

defineOptions({ name: 'TeacherPaperMaster' })

const router = useRouter()

// ─── B-8 统一考试选择器：复用 useMarkExamSelector，支持 URL/全局上下文同步 ─────
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 母版表单 ────────────────────────────────────────────────────────

const loading = ref(false)
const saving = ref(false)
// D-9 错误态：仅当后端返回非“未配置”类错误时才上报
const masterLoadError = ref<Error | null>(null)
const uploading = ref(false)
const uploadedFileName = ref('')
const masterData = ref<PaperMasterVO | null>(null)
const pageTemplateReady = ref(false)
const examTotalPages = ref<number | undefined>()

const subjectiveQuestions = computed(() =>
  questions.value.filter((item) => item.questionType === 'SUBJECTIVE'),
)

const identityEditOpen = ref(false)
const identityEditIndex = ref<number | null>(null)

const form = reactive({
  masterName: '',
  masterFileId: '',
  watermarkText: '',
})

// ─── 身份填涂区 ──────────────────────────────────────────────────────

interface IdentityAreaRow extends PaperMasterIdentityAreaRequest {
  rowKey: string
}

const identityAreas = ref<IdentityAreaRow[]>([])
let identitySeq = 0

const identityAreaTypeOptions = (
  Object.entries(PAPER_MASTER_IDENTITY_AREA_TYPE_LABEL) as Array<
    [PaperMasterIdentityAreaTypeCode, string]
  >
).map(([value, label]) => ({ value, label }))

function addIdentityArea() {
  openIdentityCreate()
}

function removeIdentityArea(index: number) {
  identityAreas.value.splice(index, 1)
}

const identityColumns: ColumnType[] = [
  { title: '区域类型', key: 'areaType', width: 120 },
  { title: '页号', dataIndex: 'pageNo', width: 72 },
  { title: 'X', dataIndex: 'x', width: 72 },
  { title: 'Y', dataIndex: 'y', width: 72 },
  { title: '宽', dataIndex: 'width', width: 72 },
  { title: '高', dataIndex: 'height', width: 72 },
  { title: '填涂格数', dataIndex: 'fillCellCount', width: 88 },
  { title: '操作', key: 'action', width: 120 },
]

// ─── 客观题填涂区 ────────────────────────────────────────────────────

interface ObjectiveAreaRow extends PaperMasterObjectiveAreaRequest {
  rowKey: string
}

const objectiveAreas = ref<ObjectiveAreaRow[]>([])
const questionsLoading = ref(false)
const questions = ref<ExamQuestionTemplateVO[]>([])
const questionOptions = computed(() =>
  questions.value.map((item) => {
    const parts = [`第 ${item.questionNo} 题`, item.questionType, `${item.fullScore} 分`]
    if (item.questionStem) {
      parts.push(item.questionStem)
    }
    return {
      label: parts.join(' · '),
      value: item.questionTemplateId,
    }
  }),
)
let objectiveSeq = 0
const DEFAULT_OBJECTIVE_OPTIONS = ['A', 'B', 'C', 'D']

function createObjectiveOptions(labels: string[] = DEFAULT_OBJECTIVE_OPTIONS) {
  return labels.map((optionLabel, index) => ({
    optionLabel,
    sortNo: index + 1,
  }))
}

const identityDraft = reactive<IdentityAreaRow>({
  rowKey: '',
  areaType: 'STUDENT_NO',
  pageNo: 1,
  x: 0,
  y: 0,
  width: 100,
  height: 50,
})

const objectiveEditOpen = ref(false)
const objectiveEditIndex = ref<number | null>(null)
const objectiveDraft = reactive<ObjectiveAreaRow>({
  rowKey: '',
  questionTemplateId: '',
  pageNo: 1,
  options: createObjectiveOptions(),
  x: 0,
  y: 0,
  boxWidth: 20,
  boxHeight: 10,
})

function openIdentityEdit(index: number) {
  const row = identityAreas.value[index]
  Object.assign(identityDraft, { ...row })
  identityEditIndex.value = index
  identityEditOpen.value = true
}

function openIdentityCreate() {
  identityEditIndex.value = null
  Object.assign(identityDraft, {
    rowKey: '',
    areaType: 'STUDENT_NO',
    pageNo: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    fillCellCount: undefined,
  })
  identityEditOpen.value = true
}

function handleIdentityEditOk() {
  if (identityEditIndex.value === null) {
    identitySeq++
    identityAreas.value.push({ ...identityDraft, rowKey: `id-${identitySeq}` })
  } else {
    identityAreas.value[identityEditIndex.value] = {
      ...identityAreas.value[identityEditIndex.value],
      ...identityDraft,
    }
  }
  identityEditOpen.value = false
}

function openObjectiveEdit(index: number) {
  const row = objectiveAreas.value[index]
  Object.assign(objectiveDraft, {
    ...row,
    options: row.options.map((option) => ({ ...option })),
  })
  objectiveEditIndex.value = index
  objectiveEditOpen.value = true
}

function openObjectiveCreate() {
  objectiveEditIndex.value = null
  Object.assign(objectiveDraft, {
    rowKey: '',
    questionTemplateId: '',
    pageNo: 1,
    options: createObjectiveOptions(),
    x: 0,
    y: 0,
    boxWidth: 20,
    boxHeight: 10,
  })
  objectiveEditOpen.value = true
}

function handleObjectiveEditOk() {
  if (objectiveEditIndex.value === null) {
    objectiveSeq++
    objectiveAreas.value.push({ ...objectiveDraft, rowKey: `obj-${objectiveSeq}` })
  } else {
    objectiveAreas.value[objectiveEditIndex.value] = {
      ...objectiveAreas.value[objectiveEditIndex.value],
      ...objectiveDraft,
      options: objectiveDraft.options.map((option) => ({ ...option })),
    }
  }
  objectiveEditOpen.value = false
}

function goPaperTemplate() {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherPaperTemplate', query: { examId: selectedExamId.value } })
}

function formatIdentityType(type: PaperMasterIdentityAreaTypeCode): string {
  return PAPER_MASTER_IDENTITY_AREA_TYPE_LABEL[type]
}

function resolveQuestionLabel(questionTemplateId: string): string {
  const question = questions.value.find((item) => item.questionTemplateId === questionTemplateId)
  return question ? `第 ${question.questionNo} 题` : questionTemplateId
}

function addObjectiveArea() {
  openObjectiveCreate()
}

function removeObjectiveArea(index: number) {
  objectiveAreas.value.splice(index, 1)
}

function addObjectiveOption(row: ObjectiveAreaRow) {
  row.options.push({
    optionLabel: String.fromCharCode(65 + row.options.length),
    sortNo: row.options.length + 1,
  })
}

function removeObjectiveOption(row: ObjectiveAreaRow, sortNo: number) {
  row.options = row.options
    .filter((option) => option.sortNo !== sortNo)
    .map((option, index) => ({
      optionLabel: option.optionLabel,
      sortNo: index + 1,
    }))
}

const objectiveColumns: ColumnType[] = [
  { title: '题目', key: 'questionTemplateId', width: 120 },
  { title: '页号', dataIndex: 'pageNo', width: 72 },
  { title: 'X', dataIndex: 'x', width: 72 },
  { title: 'Y', dataIndex: 'y', width: 72 },
  { title: '框宽', dataIndex: 'boxWidth', width: 72 },
  { title: '框高', dataIndex: 'boxHeight', width: 72 },
  { title: '选项数', key: 'optionsSummary', width: 88 },
  { title: '操作', key: 'action', width: 120 },
]

const subjectiveColumns: ColumnType[] = [
  { title: '题号', dataIndex: 'questionNo', width: 88 },
  { title: '满分', dataIndex: 'fullScore', width: 72 },
  { title: '区域', key: 'region', width: 220 },
]

// ─── 数据加载 ────────────────────────────────────────────────────────

async function loadQuestions() {
  if (!selectedExamId.value) return
  questionsLoading.value = true
  try {
    const template = await getExamTemplate(selectedExamId.value)
    questions.value = template.questions
  } catch (error) {
    questions.value = []
    showUserError(error, '题目列表加载失败')
  } finally {
    questionsLoading.value = false
  }
}

async function loadMasterData() {
  if (!selectedExamId.value) return
  loading.value = true
  masterLoadError.value = null
  try {
    const detail = await getExamDetail(selectedExamId.value)
    pageTemplateReady.value = detail.pageTemplateReady === true
    examTotalPages.value = detail.totalPages
    await loadQuestions()
    const res = await getPaperMaster(selectedExamId.value)
    masterData.value = res
    if (res) {
      form.masterName = res.masterName ?? ''
      form.masterFileId = res.masterFileId ?? ''
      form.watermarkText = res.watermarkText ?? ''
      uploadedFileName.value = ''

      identityAreas.value = res.identityAreas.map((a, i) => ({
        rowKey: `id-loaded-${i}`,
        areaType: a.areaType,
        pageNo: a.pageNo,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        fillCellCount: a.fillCellCount,
      }))
      identitySeq = identityAreas.value.length

      const invalidObjectiveArea = res.objectiveAreas.find(
        (a) =>
          !questions.value.some((question) => question.questionTemplateId === a.questionTemplateId),
      )
      if (invalidObjectiveArea) {
        objectiveAreas.value = []
        masterLoadError.value = new Error(
          '试卷母版引用的题目已不在当前考试模板中，请先完成数据治理',
        )
        return
      }

      objectiveAreas.value = res.objectiveAreas.map((a, i) => ({
        rowKey: `obj-loaded-${i}`,
        questionTemplateId: a.questionTemplateId,
        pageNo: a.pageNo,
        options: a.options.map((option) => ({
          optionLabel: option.optionLabel,
          sortNo: option.sortNo,
        })),
        x: a.x,
        y: a.y,
        boxWidth: a.boxWidth,
        boxHeight: a.boxHeight,
      }))
      objectiveSeq = objectiveAreas.value.length
    }
  } catch (error) {
    masterData.value = null
    if (!(error instanceof Error && isPaperMasterNotConfiguredError(error))) {
      masterLoadError.value = toUserError(error, '试卷主数据加载失败')
    }
  } finally {
    loading.value = false
  }
}

function clearForm() {
  form.masterName = ''
  form.masterFileId = ''
  form.watermarkText = ''
  uploadedFileName.value = ''
  identityAreas.value = []
  objectiveAreas.value = []
  questions.value = []
  identitySeq = 0
  objectiveSeq = 0
  masterData.value = null
}

function handleExamChange(value: SelectValue): void {
  // 委托给 useMarkExamSelector 完成 URL/Store 同步，再驱动业务侧加载/清空
  onExamChange(value)
  if (selectedExamId.value) {
    void loadMasterData()
  } else {
    clearForm()
  }
}

// ─── 文件上传 ────────────────────────────────────────────────────────

async function handleBeforeUpload(file: File) {
  if (file.type !== 'application/pdf') {
    message.error('只能上传 PDF 文件')
    return false
  }
  uploading.value = true
  try {
    const res = await uploadFile(file, { businessType: 'EXAM_PAPER_MASTER' })
    form.masterFileId = res.id
    uploadedFileName.value = file.name
    message.success('上传成功')
  } catch (error) {
    showUserError(error, '母版 PDF 上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
  return false
}

// ─── 生成标准试卷 ──────────────────────────────────────────────────

const pdfViewMode = ref<'preview' | 'edit'>('preview')

/** 编辑保存后回调：更新fileId并刷新预览 */
function onPdfSaved(newFileId: string) {
  form.masterFileId = newFileId
  pdfPreviewUrl.value = ''
  void previewPdf()
}

const generateModalOpen = ref(false)
const generating = ref(false)
const genForm = reactive({
  universityName: '',
  academicYear: '',
  semester: '1' as string,
  courseName: '',
  examType: '闭卷',
  durationMin: 120,
})

async function openGenerateModal() {
  genForm.universityName = ''
  genForm.academicYear = ''
  genForm.semester = '1'
  genForm.courseName = ''
  genForm.examType = '闭卷'
  genForm.durationMin = 120
  // 预填考试已有数据
  if (selectedExamId.value) {
    try {
      const d = await getExamDetail(selectedExamId.value)
      genForm.academicYear = d.academicYear ?? ''
      genForm.semester = d.semester ?? '1'
      genForm.courseName = d.examName ?? ''
    } catch { /* 预填失败不影响使用 */ }
  }
  generateModalOpen.value = true
}

async function handleGenerate() {
  if (!selectedExamId.value || !genForm.courseName.trim() || !genForm.universityName.trim()) {
    message.warning('请填写学校名称和课程名称')
    return
  }
  generating.value = true
  try {
    form.masterFileId = await generateStandardPaper({
      examId: selectedExamId.value,
      universityName: genForm.universityName.trim(),
      academicYear: genForm.academicYear.trim(),
      semester: genForm.semester,
      courseName: genForm.courseName.trim(),
      examType: genForm.examType,
      durationMin: genForm.durationMin,
    })
    form.masterName = genForm.courseName.trim() + ' 标准试卷'
    message.success('标准试卷已生成，请点击「保存母版」确认')
    generateModalOpen.value = false
    // 自动预览
    await previewPdf()
  } catch (error) {
    showUserError(error, '生成标准试卷失败')
  } finally {
    generating.value = false
  }
}

// ─── 保存 ────────────────────────────────────────────────────────────

async function handleSave() {
  if (!selectedExamId.value) return
  if (!form.masterName.trim()) {
    message.warning('请填写母版名称')
    return
  }
  if (!form.masterFileId) {
    message.warning('请上传母版 PDF 文件')
    return
  }
  for (let i = 0; i < objectiveAreas.value.length; i += 1) {
    const row = objectiveAreas.value[i]
    if (!row.questionTemplateId) {
      message.warning(`客观题填涂区第 ${i + 1} 行：请选择题目`)
      return
    }
    if (row.options.length < 2) {
      message.warning(`客观题填涂区第 ${i + 1} 行：至少需要 2 个选项`)
      return
    }
    const labels = new Set<string>()
    for (let j = 0; j < row.options.length; j += 1) {
      const label = row.options[j].optionLabel.trim()
      if (!label) {
        message.warning(`客观题填涂区第 ${i + 1} 行：第 ${j + 1} 个选项不能为空`)
        return
      }
      if (labels.has(label)) {
        message.warning(`客观题填涂区第 ${i + 1} 行：选项「${label}」重复`)
        return
      }
      labels.add(label)
    }
  }

  saving.value = true
  try {
    await savePaperMaster({
      examId: selectedExamId.value,
      masterName: form.masterName.trim(),
      masterFileId: form.masterFileId,
      watermarkText: form.watermarkText?.trim() || undefined,
      identityAreas: identityAreas.value.map((a) => ({
        areaType: a.areaType,
        pageNo: a.pageNo,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        fillCellCount: a.fillCellCount,
      })),
      objectiveAreas: objectiveAreas.value.map((a) => ({
        questionTemplateId: a.questionTemplateId,
        pageNo: a.pageNo,
        options: a.options.map((option) => ({
          optionLabel: option.optionLabel.trim(),
          sortNo: option.sortNo,
        })),
        x: a.x,
        y: a.y,
        boxWidth: a.boxWidth,
        boxHeight: a.boxHeight,
      })),
    })
    message.success('母版保存成功')
    await loadMasterData()
  } catch (error) {
    showUserError(error, '试卷母版保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// ─── PDF 预览 ────────────────────────────────────────────────────────

const pdfPreviewUrl = ref<string | null>(null)
const pdfPreviewLoading = ref(false)

async function previewPdf() {
  if (!form.masterFileId) {
    message.warning('暂无母版 PDF 文件')
    return
  }
  closePdfPreview()
  pdfPreviewLoading.value = true
  try {
    const buffer = await getFileArrayBuffer({ nodeId: form.masterFileId })
    const blob = new Blob([buffer], { type: 'application/pdf' })
    pdfPreviewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    showUserError(error, '母版 PDF 预览加载失败，请稍后重试')
  } finally {
    pdfPreviewLoading.value = false
  }
}

function openPdfInNewTab() {
  if (pdfPreviewUrl.value) {
    window.open(pdfPreviewUrl.value, '_blank', 'noopener,noreferrer')
  }
}

function closePdfPreview() {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value)
    pdfPreviewUrl.value = null
  }
}

onBeforeUnmount(() => {
  closePdfPreview()
})

// ─── 初始化 ──────────────────────────────────────────────────────────

onMounted(async () => {
  await initExamSelector()
  // URL → 组件初次加载时若有 examId，watch(selectedExamId) 会自动触发 loadMasterData
})

watch(
  selectedExamId,
  (val) => {
    if (val) {
      loadMasterData()
    }
  },
  { immediate: false },
)
</script>

<style lang="scss" scoped>
.paper-master-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    margin-top: 80px;
  }

  .empty-block {
    margin-top: 80px;
  }

  .preview-card {
    margin-bottom: 16px;

    .pdf-iframe {
      width: 100%;
      height: 600px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
    }

    .pdf-placeholder {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-3);
      font-size: 13px;
    }
  }

  .info-card {
    margin-bottom: 16px;
  }

  .area-card {
    margin-bottom: 16px;
  }

  .uploaded-hint {
    margin-left: 8px;
    color: var(--color-text-3);
    font-size: 13px;
  }

  .objective-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 148px;
  }

  .objective-options__item {
    display: grid;
    grid-template-columns: minmax(56px, 1fr) 42px;
    align-items: center;
    column-gap: 6px;
  }

  .objective-options__input {
    width: 100%;
  }

  .objective-options__remove {
    padding: 0;
  }
}
</style>
