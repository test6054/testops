<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioExpertAssignmentReviewBundleVO,
  PortfolioExpertAssignmentSubjectTeacherVO,
  PortfolioExpertReviewMaterialItemVO,
} from '@/apis/portfolio/expert-assignment'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { showUserError } from '@/utils/error-handler'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()

function goTeacherMasterpiece(teacherUserId?: string) {
  if (!teacherUserId) return
  void router.push({
    path: '/portfolio/teacher/masterpiece',
    query: { teacherId: teacherUserId },
  })
}
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const bundle = ref<PortfolioExpertAssignmentReviewBundleVO | null>(null)
const errorMessage = ref('')
const requestToken = ref(0)

/** 被评教师中处于评价参评 hold 的人数（TEMP_HOLD/SEALED 等）。 */
const heldSubjectCount = computed(() =>
  (bundle.value?.subjectTeachers ?? []).filter((item) => Boolean(item.evaluationHeld)).length,
)

/** 是否全部被评教师均参评 hold，填报入口应禁用。 */
const allSubjectsEvaluationHeld = computed(() => {
  const teachers = bundle.value?.subjectTeachers ?? []
  return teachers.length > 0 && heldSubjectCount.value === teachers.length
})

const accessToken = computed(() => {
  const token = route.query.accessToken
  return typeof token === 'string' ? token : undefined
})

const assignmentId = computed(() => {
  const id = route.query.assignmentId
  return typeof id === 'string' ? id : undefined
})

const subjectTeacherColumns = computed<ColumnsType>(() => {
  const cols: ColumnsType = [
    { title: '被评教师', dataIndex: 'maskedDisplayName', key: 'maskedDisplayName' },
    { title: '生命周期', key: 'lifecycleStatus', width: 160 },
    { title: '身份层', key: 'identityLayers', width: 160 },
  ]
  // 脱敏审阅不暴露 teacherUserId，也不提供读整袋深链
  if (!bundle.value?.maskRequired) {
    cols.push(
      { title: '教师编号', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
      { title: '操作', key: 'actions', width: 100 },
    )
  }
  return cols
})

function subjectRowKey(record: unknown): string {
  const row = record as PortfolioExpertAssignmentSubjectTeacherVO
  return row.subjectRef || row.teacherUserId || row.maskedDisplayName || ''
}

function materialRowKey(record: unknown): string {
  const row = record as PortfolioExpertReviewMaterialItemVO
  return (
    row.materialRef
    || row.archiveRecordId
    || `${row.maskedTeacherLabel}-${row.categoryCode}-${row.academicYear}`
  )
}

const materialColumns: ColumnsType = [
  { title: '教师', dataIndex: 'maskedTeacherLabel', key: 'maskedTeacherLabel', width: 140 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 160 },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 140 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 100 },
  { title: '版本', dataIndex: 'documentVersionNo', key: 'documentVersionNo', width: 80 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '主附件', key: 'hasPrimaryFile', width: 90 },
  { title: '身份切片', key: 'identityScope', width: 100 },
  { title: '校内硬性', key: 'usableForCampusHardCriteria', width: 110 },
  { title: '支撑材料', dataIndex: 'supportMaterialCount', key: 'supportMaterialCount', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: 'AI 初审', key: 'aiPreReview', width: 220 },
]

async function loadBundle() {
  if (!accessToken.value && !assignmentId.value) {
    bundle.value = null
    errorMessage.value = '缺少外部专家授权上下文。'
    return
  }
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    accessToken: accessToken.value,
    assignmentId: assignmentId.value,
  }
  beginLoad()
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await portfolioExpertAssignmentApi.reviewBundle(request)
    if (requestToken.value !== currentToken) return
    bundle.value = result
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) return
    failLoad()
    bundle.value = null
    errorMessage.value = '授权无效、已过期、已被吊销或当前账号无权审阅。'
    showUserError(error, '加载专家审阅包失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function goEvaluationFill() {
  if (!bundle.value?.evaluationTaskId) {
    return
  }
  if (allSubjectsEvaluationHeld.value) {
    showUserError(new Error('被评教师均处于参评 hold，禁止进入评价填报'), '无法填报')
    return
  }
  void router.push({
    path: '/portfolio/expert/evaluation-fill',
    query: { evaluationTaskId: bundle.value.evaluationTaskId },
  })
}

onMounted(() => {
  void loadBundle()
})

watch(
  () => [route.query.accessToken, route.query.assignmentId],
  () => {
    void loadBundle()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="外部专家脱敏审阅"
        subtitle="只读审阅正式档案材料；填分请进入评价填报"
      >
        <template #actions>
          <UiButton
            size="sm"
            v-if="bundle"
            variant="primary"
            :disabled="allSubjectsEvaluationHeld"
            @click="goEvaluationFill"
          >
            去评价填报
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard :loading="loading">
      <template v-if="bundle">
        <div class="expert-review__meta">
          <span>任务：{{ bundle.evaluationTaskName }}</span>
          <UiTag :tone="bundle.readOnly ? 'blue' : 'gray'">
            {{ bundle.readOnly ? '只读' : '—' }}
          </UiTag>
          <UiTag :tone="bundle.maskRequired ? 'green' : 'gray'">
            {{ bundle.maskRequired ? '已脱敏' : '未脱敏' }}
          </UiTag>
          <span>过期：{{ bundle.expireTime }}</span>
          <UiTag v-if="heldSubjectCount > 0" tone="orange">
            参评 hold {{ heldSubjectCount }}/{{ bundle.subjectTeachers.length }}
          </UiTag>
        </div>
        <p v-if="heldSubjectCount > 0" class="expert-review__hold-hint">
          封存 / 暂挂 / 迁出链路教师处于评价参评 hold：材料只读可查，禁止对其填报；后端会硬拦，禁止假成功。
        </p>
        <UiDataTable
          pagination-mode="none"
          class="expert-review__teachers"
          :columns="subjectTeacherColumns"
          :data-source="bundle.subjectTeachers"
          :show-pagination="false"
          :total="bundle.subjectTeachers.length"
          :row-key="subjectRowKey"
          size="small"
          flat
          empty-kind="first-run"
          empty-description="当前审阅包无被评教师，请核对指派或令牌。"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="record.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">—</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
                :row-key="record.teacherUserId || record.maskedDisplayName || record.maskedTeacherLabel || ''"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                variant="soft"
                :disabled="!record.teacherUserId"
                @click="goTeacherMasterpiece(record.teacherUserId)"
              >
                读整袋
              </UiButton>
            </template>
          </template>
        </UiDataTable>
        <h4 class="expert-review__section-title">授权材料清单</h4>
        <UiDataTable
          :load-error="loadError"
          :row-key="materialRowKey"
          :columns="materialColumns"
          :data-source="bundle.materials"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="record.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">—</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
                :row-key="record.teacherUserId || record.maskedDisplayName || record.maskedTeacherLabel || ''"
              />
            </template>
            <template v-else-if="column.key === 'hasPrimaryFile'">
              {{ record.hasPrimaryFile ? '有' : '无' }}
            </template>
            <template v-else-if="column.key === 'identityScope'">
              <UiTag :tone="record.identityScope === 'EXTERNAL' ? 'orange' : record.identityScope === 'SHARED' ? 'green' : 'blue'">
                {{
                  record.identityScope === 'CAMPUS'
                    ? '校内'
                    : record.identityScope === 'EXTERNAL'
                      ? '仅外部'
                      : record.identityScope === 'SHARED'
                        ? '共享'
                        : (record.identityScope || '—')
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'usableForCampusHardCriteria'">
              <UiTag :tone="record.usableForCampusHardCriteria ? 'green' : 'orange'">
                {{ record.usableForCampusHardCriteria ? '可用' : '不可用' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'aiPreReview'">
              <template v-if="record.hasAiPreReview">
                <div class="expert-review__ai">
                  <UiTag tone="blue">有 AI 初审</UiTag>
                  <span v-if="record.aiPreReviewConclusionCode">结论：{{ record.aiPreReviewConclusionCode }}</span>
                  <span v-if="record.aiPreReviewResultTitle" class="expert-review__ai-title">
                    {{ record.aiPreReviewResultTitle }}
                  </span>
                  <span v-if="record.aiPreReviewSummary" class="expert-review__ai-summary">
                    {{ record.aiPreReviewSummary }}
                  </span>
                  <span v-else-if="bundle?.maskRequired" class="expert-review__ai-muted">
                    脱敏模式不展示初审自由文本
                  </span>
                </div>
              </template>
              <span v-else class="expert-review__ai-muted">无</span>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty size="sm" title="暂无内容" />
          </template>
        </UiDataTable>
      </template>
      <UiEmpty
        size="sm"
        v-else
        :title="errorMessage ? '无法打开审阅包' : '暂无内容'"
        :description="errorMessage || '当前授权没有可审阅材料。'"
      >
        <template #action>
          <UiButton size="sm" variant="primary" :loading="loading" @click="loadBundle">重试</UiButton>
        </template>
      </UiEmpty>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-review__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}
.expert-review__teachers {
  margin-bottom: 16px;
}
.expert-review__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.expert-review__hold-hint {
  margin: 0 0 12px;
  color: var(--dp-color-warning, #d48806);
  font-size: 13px;
}
</style>
