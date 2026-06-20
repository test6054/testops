<template>
  <div class="spot-check-page">
    <div class="spot-check-page__toolbar">
      <UiTag :tone="pendingItems.length > 0 ? 'orange' : 'green'" size="sm">
        待处理 {{ pendingItems.length }}
      </UiTag>
      <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <UiCard class="info-card">
      <template #title>
        <AimOutlined />
        <span>我的待处理抽检</span>
        <UiBadge :tone="pendingItems.length > 0 ? 'orange' : 'gray'">
          {{ pendingItems.length }}
        </UiBadge>
      </template>

      <UiDataTable
        pagination-mode="client"
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="pendingItems"
        :loading="loading"
        :page-size="20"
        :total="pendingItems.length"
        flat
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examId'">
            <span class="spot-check-page__exam-cell">
              {{ pendingItems[index].examName }}
            </span>
            <div class="spot-check-page__sub">{{ pendingItems[index].examNo }}</div>
          </template>
          <template v-else-if="column.key === 'question'">
            <span>
              第 {{ pendingItems[index].questionNo }} 题 ·
              {{ pendingItems[index].questionTypeMessage }}
            </span>
            <div class="spot-check-page__sub">
              {{ pendingItems[index].groupName }} ·
              {{ pendingItems[index].paperDisplay.primaryText }}
            </div>
            <div class="spot-check-page__sub">
              {{ pendingItems[index].paperDisplay.secondaryText }}
            </div>
          </template>
          <template v-else-if="column.key === 'originalScore'">
            <span class="spot-check-page__score">
              {{ formatScore(pendingItems[index].originalScore) }}
            </span>
          </template>
          <template v-else-if="column.key === 'spotCheckStatus'">
            <UiTag :tone="statusTone(pendingItems[index].spotCheckStatus)" size="sm">
              {{ statusLabel(pendingItems[index].spotCheckStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(pendingItems[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction tone="primary" @click="openHandleModal(pendingItems[index])">处理结论</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <!-- 内联处理结论 Modal -->
    <a-modal
      v-model:open="modalOpen"
      title="处理抽检结论"
      :destroy-on-close="true"
      :confirm-loading="submitting"
      :ok-button-props="{ disabled: !valid }"
      ok-text="提交结论"
      width="640px"
      @ok="submitConclusion"
    >
      <a-descriptions
        v-if="targetItem"
        :column="2"
        size="small"
        bordered
        class="spot-check-page__target-desc"
      >
        <a-descriptions-item label="考试">
          {{ targetItem.examName }}（{{ targetItem.examNo }}）
        </a-descriptions-item>
        <a-descriptions-item label="题组">
          {{ targetItem.groupName }}
        </a-descriptions-item>
        <a-descriptions-item label="题目">
          第 {{ targetItem.questionNo }} 题 · {{ targetItem.questionTypeMessage }}
        </a-descriptions-item>
        <a-descriptions-item label="答卷">
          {{ targetItem.paperDisplay.primaryText }}
          <div class="spot-check-page__sub">{{ targetItem.paperDisplay.secondaryText }}</div>
        </a-descriptions-item>
        <a-descriptions-item label="抽检前教师复核评分">
          {{ formatScore(targetItem.originalScore) }}
        </a-descriptions-item>
        <a-descriptions-item label="分派时间">
          {{ formatDateTime(targetItem.createTime) }}
        </a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical" class="spot-check-page__form">
        <a-form-item label="处理结论" required>
          <a-radio-group v-model:value="form.conclusion">
            <a-radio-button value="PASSED">一致通过</a-radio-button>
            <a-radio-button value="ABNORMAL">判分异常</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item v-if="form.conclusion === 'ABNORMAL'" label="抽检评分（可选）">
          <a-input-number
            v-model:value="form.reviewScore"
            :min="0"
            :step="0.5"
            class="spot-check-page__field-full"
            placeholder="如认为该题需要调整，填写抽检评分"
          />
        </a-form-item>

        <a-form-item label="处理说明">
          <a-textarea
            v-model:value="form.handleNote"
            :rows="4"
            :placeholder="
              form.conclusion === 'ABNORMAL'
                ? '判分异常时请填写依据（500 字内）'
                : '可选：填写一致通过的简要说明'
            "
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  MyPendingSpotCheckItemResponse,
  MyPendingSpotCheckStatusCode,
  SpotCheckConclusionCode,
} from '@/apis/mark/marking-quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  handleSpotCheck,
  listMyPendingSpotChecks,
  SPOT_CHECK_STATUS_LABEL,
  SPOT_CHECK_STATUS_TONE,
} from '@/apis/mark/marking-quality'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiTag,
} from '@/components/ui-guide/ui'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingSpotCheck' })

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

// ─── 待处理抽检列表 ──────────────────────────────────────
const pendingItems = ref<MyPendingSpotCheckItemResponse[]>([])
const loading = ref(false)
const listLoadError = ref<Error | null>(null)

async function loadList(): Promise<void> {
  loading.value = true
  listLoadError.value = null
  try {
    pendingItems.value = await listMyPendingSpotChecks({
      examId: selectedExamId.value || undefined,
    })
  } catch (error) {
    listLoadError.value = toUserError(error, '待处理阅卷抽检加载失败')
    showUserError(error, '待处理阅卷抽检加载失败')
    pendingItems.value = []
  } finally {
    loading.value = false
  }
}

const columns: ColumnType<MyPendingSpotCheckItemResponse>[] = [
  { title: '考试', key: 'examId', width: 220, ellipsis: true },
  { title: '题目', key: 'question', width: 240 },
  { title: '抽检前教师复核评分', key: 'originalScore', width: 160, align: 'right' },
  { title: '抽检状态', key: 'spotCheckStatus', width: 110 },
  { title: '分派时间', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

function statusTone(status: MyPendingSpotCheckStatusCode): BadgeTone {
  return strictEnumTone(SPOT_CHECK_STATUS_TONE, status, '抽检状态')
}

function statusLabel(status: MyPendingSpotCheckStatusCode): string {
  return strictEnumLabel(SPOT_CHECK_STATUS_LABEL, status, '抽检状态')
}

function formatScore(value: number): string {
  return value.toFixed(2)
}

// ─── 内联处理 Modal ─────────────────────────────────────
const modalOpen = ref(false)
const submitting = ref(false)
const targetItem = ref<MyPendingSpotCheckItemResponse | null>(null)

// a-input-number v-model:value 不接受 null，未填状态统一用 undefined
interface SpotCheckForm {
  conclusion: SpotCheckConclusionCode
  reviewScore: number | undefined
  handleNote: string
}

const form = reactive<SpotCheckForm>({
  conclusion: 'PASSED',
  reviewScore: undefined,
  handleNote: '',
})

const valid = computed(() => Boolean(targetItem.value?.id && form.conclusion))

function openHandleModal(item: MyPendingSpotCheckItemResponse): void {
  targetItem.value = item
  form.conclusion = 'PASSED'
  form.reviewScore = undefined
  form.handleNote = ''
  modalOpen.value = true
}

async function submitConclusion(): Promise<void> {
  if (!valid.value || !targetItem.value) return
  submitting.value = true
  try {
    await handleSpotCheck({
      spotCheckId: targetItem.value.id,
      conclusion: form.conclusion,
      reviewScore: form.reviewScore,
      handleNote: form.handleNote.trim() || undefined,
    })
    message.success('已提交抽检处理结论')
    pendingItems.value = pendingItems.value.filter((item) => item.id !== targetItem.value?.id)
    modalOpen.value = false
    targetItem.value = null
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '阅卷抽检结论提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadList()
})
</script>

<style lang="scss" scoped>
.spot-check-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__alert {
    margin-bottom: 4px;
  }

  &__form {
    margin-top: 12px;
  }

  &__field-full {
    width: 100%;
  }

  &__target-desc {
    margin-bottom: 4px;
  }

  &__exam-cell {
    font-weight: 500;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }

  &__sub {
    font-size: 12px;
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  }

  &__score {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  &__hint {
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  }
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
