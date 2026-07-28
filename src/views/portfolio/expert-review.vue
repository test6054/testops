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
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { PORTFOLIO_POLICY_MATCH_CONCLUSION_LABEL } from '@/types/enums/portfolio-policy-match-conclusion-enum'
import { showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
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

/** UiDataTable 插槽 record 为 unknown，收窄为被评教师 API VO。 */
function subjectTeacherRow(record: unknown): PortfolioExpertAssignmentSubjectTeacherVO {
  return record as PortfolioExpertAssignmentSubjectTeacherVO
}

/** UiDataTable 插槽 record 为 unknown，收窄为审阅材料 API VO。 */
function materialRow(record: unknown): PortfolioExpertReviewMaterialItemVO {
  return record as PortfolioExpertReviewMaterialItemVO
}

function subjectTeacherRowKey(record: unknown): string {
  const row = subjectTeacherRow(record)
  return row.subjectRef || row.teacherUserId || row.maskedDisplayName
}

function materialRowKey(record: unknown): string {
  const row = materialRow(record)
  return row.materialRef || row.archiveRecordId || `${row.maskedTeacherLabel}-${row.categoryCode}-${row.academicYear}`
}

function subjectLifecycleTone(record: unknown) {
  return portfolioLifecycleTagTone(subjectTeacherRow(record).lifecycleStatus)
}

function materialLifecycleTone(record: unknown) {
  return portfolioLifecycleTagTone(materialRow(record).lifecycleStatus)
}

function identityScopeTone(record: unknown): 'orange' | 'green' | 'blue' {
  const scope = materialRow(record).identityScope
  if (scope === 'EXTERNAL') return 'orange'
  if (scope === 'SHARED') return 'green'
  return 'blue'
}

function identityScopeLabel(record: unknown): string {
  const scope = materialRow(record).identityScope
  if (scope === 'CAMPUS') return '校内'
  if (scope === 'EXTERNAL') return '仅外部'
  if (scope === 'SHARED') return '共享'
  if (!scope) return '—'
  throw new Error(`专家审阅材料 identityScope 契约异常: ${scope}`)
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

const subjectTeacherColumns = computed<ColumnsType<PortfolioExpertAssignmentSubjectTeacherVO>>(() => {
  const cols: ColumnsType<PortfolioExpertAssignmentSubjectTeacherVO> = [
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

const materialColumns: ColumnsType<PortfolioExpertReviewMaterialItemVO> = [
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
    query: {
      evaluationTaskId: bundle.value.evaluationTaskId,
      assignmentId: bundle.value.assignmentId,
    },
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
          :row-key="subjectTeacherRowKey"
          size="small"
          flat
          empty-kind="first-run"
          empty-description="当前审阅包无被评教师，请核对指派或令牌。"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="subjectTeacherRow(record).lifecycleStatus" :tone="subjectLifecycleTone(record)">
                {{ portfolioLifecycleStatusDisplay(subjectTeacherRow(record).lifecycleStatus) }}
              </UiTag>
              <UiTag v-if="subjectTeacherRow(record).evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!subjectTeacherRow(record).lifecycleStatus">—</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="subjectTeacherRow(record).ownerIdentityLayers"
                :note="subjectTeacherRow(record).ownerMultiIdentityNote"
                :row-key="subjectTeacherRow(record).subjectRef || subjectTeacherRow(record).teacherUserId || subjectTeacherRow(record).maskedDisplayName || ''"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                variant="soft"
                :disabled="!subjectTeacherRow(record).teacherUserId"
                @click="goTeacherMasterpiece(subjectTeacherRow(record).teacherUserId)"
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
              <UiTag v-if="materialRow(record).lifecycleStatus" :tone="materialLifecycleTone(record)">
                {{ portfolioLifecycleStatusDisplay(materialRow(record).lifecycleStatus) }}
              </UiTag>
              <UiTag v-if="materialRow(record).evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!materialRow(record).lifecycleStatus">—</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="materialRow(record).ownerIdentityLayers"
                :note="materialRow(record).ownerMultiIdentityNote"
                :row-key="materialRow(record).materialRef || materialRow(record).archiveRecordId || materialRow(record).maskedTeacherLabel || ''"
              />
            </template>
            <template v-else-if="column.key === 'hasPrimaryFile'">
              {{ materialRow(record).hasPrimaryFile ? '有' : '无' }}
            </template>
            <template v-else-if="column.key === 'identityScope'">
              <UiTag :tone="identityScopeTone(record)">
                {{ identityScopeLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'usableForCampusHardCriteria'">
              <UiTag :tone="materialRow(record).usableForCampusHardCriteria ? 'green' : 'orange'">
                {{ materialRow(record).usableForCampusHardCriteria ? '可用' : '不可用' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'aiPreReview'">
              <template v-if="materialRow(record).hasAiPreReview">
                <div class="expert-review__ai">
                  <UiTag tone="blue">有 AI 初审</UiTag>
                  <span v-if="materialRow(record).aiPreReviewConclusionCode">
                    结论：{{ PORTFOLIO_POLICY_MATCH_CONCLUSION_LABEL[materialRow(record).aiPreReviewConclusionCode!] }}
                  </span>
                  <span v-if="materialRow(record).aiPreReviewResultTitle" class="expert-review__ai-title">
                    {{ materialRow(record).aiPreReviewResultTitle }}
                  </span>
                  <span v-if="materialRow(record).aiPreReviewSummary" class="expert-review__ai-summary">
                    {{ materialRow(record).aiPreReviewSummary }}
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
        :description="
          errorMessage
            ? errorMessage
            : '当前授权没有可审阅材料。'
        "
      />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-review__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
  align-items: center;
  margin-bottom: var(--dp-space-block);
  font-size: var(--dp-font-size-md);
}
.expert-review__teachers {
  margin-bottom: var(--dp-space-block);
}
.expert-review__section-title {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.expert-review__hold-hint {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-warning, #d48806);
  font-size: var(--dp-font-size-sm);
}
.expert-review__ai {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  align-items: flex-start;
}
.expert-review__ai-title {
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  color: var(--dp-text-primary);
}
.expert-review__ai-summary {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  line-height: 1.4;
}
.expert-review__ai-muted {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
