<template>
  <GiPageLayout>
    <div class="roster-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="roster-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="roster-page__hero">
            <div class="roster-page__hero-main">
              <div class="roster-page__title-row">
                <h1 class="roster-page__title">考生名册</h1>
                <UiTag tone="purple" size="md">班级范围 · 名册维护</UiTag>
                <UiTag v-if="selectedExamId" tone="blue" size="md">
                  {{ candidates.length }} 名考生
                </UiTag>
              </div>
              <p class="roster-page__desc">
                维护考试范围内的班级集合与考生名单。保存即全量替换，启用考试前必须至少有一名考生。
              </p>
            </div>
            <div class="roster-page__hero-actions">
              <a-select
                v-model:value="selectedExamId"
                style="width: 320px"
                placeholder="选择考试（仅显示已启用）"
                :options="examOptions"
                :loading="examOptionsLoading"
                show-search
                option-filter-prop="label"
                allow-clear
                @change="handleExamChange"
              />
              <UiButton
                size="md"
                :disabled="!selectedExamId"
                :loading="saving"
                @click="handleSave"
              >
                <template #icon>
                  <SaveOutlined />
                </template>
                保存名册
              </UiButton>
            </div>
          </div>

          <div v-if="selectedExamId" class="roster-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">考生总数</span>
              <strong class="workspace-summary__value">{{ candidates.length }}</strong>
              <span class="workspace-summary__desc">本场考试名册</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">班级范围</span>
              <strong class="workspace-summary__value">{{ classIds.length }}</strong>
              <span class="workspace-summary__desc">个班级</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已存在</span>
              <strong class="workspace-summary__value">{{ persistedCount }}</strong>
              <span class="workspace-summary__desc">已落库考生</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">待保存</span>
              <strong class="workspace-summary__value">{{ pendingCount }}</strong>
              <span class="workspace-summary__desc">本次新增</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择需要维护的考试"
        class="empty-block"
      />

      <a-spin v-else :spinning="loading">
        <UiCard class="info-card">
          <template #title>
            <TeamOutlined />
            <span>班级范围</span>
            <UiBadge tone="blue">{{ classIds.length }}</UiBadge>
          </template>
          <template #extra>
            <a-space>
              <a-input
                v-model:value="newClassIdInput"
                placeholder="班级ID（数字）"
                style="width: 180px"
                @press-enter="addClassId"
              />
              <UiButton size="sm" variant="outline" @click="addClassId">添加</UiButton>
            </a-space>
          </template>

          <UiEmpty v-if="!classIds.length" description="当前未配置班级范围" />
          <a-space v-else wrap>
            <UiTag
              v-for="classId in classIds"
              :key="classId"
              tone="blue"
              size="sm"
              closable
              @close="removeClassId(classId)"
            >
              班级 #{{ classId }}
            </UiTag>
          </a-space>
        </UiCard>

        <UiCard class="info-card">
          <template #title>
            <UserOutlined />
            <span>考生名册</span>
            <UiBadge tone="blue">{{ candidates.length }}</UiBadge>
          </template>
          <template #extra>
            <a-space>
              <UiButton size="sm" variant="outline" @click="openBatchModal">
                <template #icon>
                  <ImportOutlined />
                </template>
                批量粘贴
              </UiButton>
              <UiButton size="sm" @click="addCandidate">
                <template #icon>
                  <PlusOutlined />
                </template>
                新增考生
              </UiButton>
            </a-space>
          </template>

          <a-table
            :columns="columns"
            :data-source="candidates"
            :pagination="false"
            row-key="rowKey"
            size="middle"
            class="roster-table"
            bordered
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'studentNo'">
                <a-input
                  v-model:value="record.studentNo"
                  placeholder="学号（必填）"
                  size="small"
                />
              </template>
              <template v-else-if="column.key === 'studentName'">
                <a-input
                  v-model:value="record.studentName"
                  placeholder="姓名（必填）"
                  size="small"
                />
              </template>
              <template v-else-if="column.key === 'studentUserId'">
                <a-input
                  v-model:value="record.studentUserId"
                  placeholder="学生用户ID（必填）"
                  size="small"
                />
              </template>
              <template v-else-if="column.key === 'classId'">
                <a-input
                  v-model:value="record.classId"
                  placeholder="班级ID（可选）"
                  size="small"
                />
              </template>
              <template v-else-if="column.key === 'serverStatus'">
                <UiTag v-if="record.candidateRosterId" tone="green" size="sm">已存在</UiTag>
                <UiTag v-else tone="orange" size="sm">待保存</UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiButton size="sm" variant="ghost" @click="removeCandidate(index)">
                  删除
                </UiButton>
              </template>
            </template>
          </a-table>

          <div class="roster-summary">
            共 {{ candidates.length }} 名考生
          </div>
        </UiCard>
      </a-spin>
    </div>

    <a-modal
      v-model:open="batchModalOpen"
      title="批量粘贴考生"
      ok-text="追加到名册"
      :destroy-on-close="true"
      width="640px"
      @ok="handleBatchImport"
    >
      <a-alert
        type="info"
        show-icon
        message="粘贴格式"
        description="每行一名考生，使用英文逗号或制表符分隔：学号,姓名,班级ID,学生用户ID。班级ID 可留空，学号/姓名/学生用户ID 为必填。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="batchText"
        :rows="10"
        placeholder="20240001,张三,101,1001&#10;20240002,李四,101,1002"
      />
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamCandidateRosterPayload, ExamSummaryVO } from '@/apis/mark/exam'
import ImportOutlined from '@ant-design/icons-vue/ImportOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getExamDetail,
  listExamCandidates,
  pageExams,
  saveExamScope,
} from '@/apis/mark/exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherCandidateRoster' })

const route = useRoute()
const router = useRouter()

interface CandidateRow {
  rowKey: string
  candidateRosterId?: string
  studentNo: string
  studentName: string
  studentUserId: string
  classId: string
}

let rowSeq = 0
function nextRowKey(): string {
  rowSeq += 1
  return `row-${rowSeq}-${Date.now()}`
}

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string, value: string }>>([])
const examOptionsLoading = ref(false)

const classIds = ref<string[]>([])
const candidates = reactive<CandidateRow[]>([])
const newClassIdInput = ref('')

const loading = ref(false)
const saving = ref(false)

const persistedCount = computed(() => candidates.filter(c => c.candidateRosterId).length)
const pendingCount = computed(() => candidates.filter(c => !c.candidateRosterId).length)

const columns: ColumnType<CandidateRow>[] = [
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 200 },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 160 },
  { title: '学生用户ID', key: 'studentUserId', dataIndex: 'studentUserId', width: 200 },
  { title: '班级ID', key: 'classId', dataIndex: 'classId', width: 160 },
  { title: '状态', key: 'serverStatus', width: 100 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? [])
      .filter((item: ExamSummaryVO) => item.status === 'ACTIVE')
      .map((item: ExamSummaryVO) => ({
        label: `${item.examName}（${item.statusMessage}）`,
        value: item.examId,
      }))
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '加载考试列表失败'
    message.error(errMsg)
  }
  finally {
    examOptionsLoading.value = false
  }
}

async function loadRoster(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const [detail, list] = await Promise.all([
      getExamDetail(selectedExamId.value),
      listExamCandidates(selectedExamId.value),
    ])
    classIds.value = [...(detail.classIds ?? [])]
    candidates.splice(0, candidates.length)
    list.forEach((item) => {
      candidates.push({
        rowKey: nextRowKey(),
        candidateRosterId: item.candidateRosterId,
        studentNo: item.studentNo,
        studentName: item.studentName,
        studentUserId: item.studentUserId,
        classId: item.classId ?? '',
      })
    })
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '加载名册失败'
    message.error(errMsg)
  }
  finally {
    loading.value = false
  }
}

function handleExamChange(value: string | undefined): void {
  selectedExamId.value = value
  void router.replace({ query: value ? { examId: value } : {} })
  if (value) {
    void loadRoster()
  }
  else {
    classIds.value = []
    candidates.splice(0, candidates.length)
  }
}

function addClassId(): void {
  const raw = newClassIdInput.value.trim()
  if (!raw) return
  if (!/^\d+$/.test(raw)) {
    message.warning('班级ID 必须为正整数')
    return
  }
  if (classIds.value.includes(raw)) {
    message.warning('该班级已在范围内')
    newClassIdInput.value = ''
    return
  }
  classIds.value.push(raw)
  newClassIdInput.value = ''
}

function removeClassId(classId: string): void {
  classIds.value = classIds.value.filter(id => id !== classId)
}

function addCandidate(): void {
  candidates.push({
    rowKey: nextRowKey(),
    studentNo: '',
    studentName: '',
    studentUserId: '',
    classId: classIds.value[0] ?? '',
  })
}

function removeCandidate(index: number): void {
  candidates.splice(index, 1)
}

const batchModalOpen = ref(false)
const batchText = ref('')

function openBatchModal(): void {
  batchText.value = ''
  batchModalOpen.value = true
}

function handleBatchImport(): void {
  const lines = batchText.value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)

  let added = 0
  let skipped = 0
  for (const line of lines) {
    const cells = line.split(/[,\t]/).map(s => s.trim())
    const [studentNo, studentName, classId, studentUserId] = cells
    if (!studentNo || !studentName || !studentUserId) {
      skipped += 1
      continue
    }
    if (!/^\d+$/.test(studentUserId)) {
      skipped += 1
      continue
    }
    if (classId && !/^\d+$/.test(classId)) {
      skipped += 1
      continue
    }
    candidates.push({
      rowKey: nextRowKey(),
      studentNo,
      studentName,
      studentUserId,
      classId: classId || '',
    })
    added += 1
  }
  if (added > 0) {
    message.success(`已追加 ${added} 名考生${skipped ? `（${skipped} 行格式错误已跳过）` : ''}`)
  }
  else {
    message.warning('没有有效行被追加')
  }
  batchModalOpen.value = false
}

function validateAndBuildPayload(): ExamCandidateRosterPayload[] | null {
  const payload: ExamCandidateRosterPayload[] = []
  const seenNo = new Set<string>()
  for (let i = 0; i < candidates.length; i += 1) {
    const row = candidates[i]
    const no = row.studentNo.trim()
    const name = row.studentName.trim()
    const userId = row.studentUserId.trim()
    const classId = row.classId.trim()
    if (!no || !name || !userId) {
      message.error(`第 ${i + 1} 行：学号、姓名、学生用户ID 均为必填`)
      return null
    }
    if (!/^\d+$/.test(userId)) {
      message.error(`第 ${i + 1} 行：学生用户ID 必须为正整数`)
      return null
    }
    if (classId && !/^\d+$/.test(classId)) {
      message.error(`第 ${i + 1} 行：班级ID 必须为正整数`)
      return null
    }
    if (seenNo.has(no)) {
      message.error(`第 ${i + 1} 行：学号 ${no} 重复`)
      return null
    }
    seenNo.add(no)
    payload.push({
      studentNo: no,
      studentName: name,
      studentUserId: userId,
      classId: classId || undefined,
    })
  }
  return payload
}

async function handleSave(): Promise<void> {
  if (!selectedExamId.value) return
  const candidatePayload = validateAndBuildPayload()
  if (candidatePayload === null) return
  saving.value = true
  try {
    await saveExamScope({
      examId: selectedExamId.value,
      classIds: classIds.value.length ? [...classIds.value] : undefined,
      candidates: candidatePayload.length ? candidatePayload : undefined,
    })
    message.success('名册已保存')
    await loadRoster()
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '保存名册失败'
    message.error(errMsg)
  }
  finally {
    saving.value = false
  }
}

watch(
  () => route.query.examId,
  (value) => {
    const next = value ? String(value) : undefined
    if (next !== selectedExamId.value) {
      selectedExamId.value = next
      if (next) {
        void loadRoster()
      }
    }
  },
)

onMounted(async () => {
  await loadExamOptions()
  if (selectedExamId.value) {
    await loadRoster()
  }
})
</script>

<style lang="scss" scoped>
.roster-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.roster-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }
}

.roster-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.roster-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.roster-page__desc {
  margin: 0;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.roster-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.roster-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.roster-summary {
  margin-top: 12px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  text-align: right;
}

.empty-block {
  padding: 60px 0;
}
</style>
