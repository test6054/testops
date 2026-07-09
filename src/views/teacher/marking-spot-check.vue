<template>
  <StageWorkbenchShell class="spot-check-page">
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag :tone="pendingCount > 0 ? 'orange' : 'green'" size="sm">
            {{ pendingCount > 0 ? `${pendingCount} 条待处理` : '暂无待办' }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" compact :metrics="spotCheckSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请从考试工作台进入阅卷抽检" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <UiDataTable
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          pagination-mode="server"
          :columns="columns"
          :data-source="pendingItems"
          :loading="loading"
          :total="pagination.total"
          flat
          row-key="id"
          size="middle"
          empty-kind="first-run"
          empty-description="暂无待处理抽检项，当前批阅质量正常"
          @page-change="handlePageChange"
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
              <UiTableActions
                :items="buildSpotCheckActions(pendingItems[index])"
                split
                @action="(key) => handleSpotCheckAction(key, pendingItems[index])"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>

    <UiDialog
      v-model:open="modalOpen"
      title="处理抽检结论"
      :width="640"
      :confirm-loading="submitting"
      ok-text="提交结论"
      @ok="submitConclusion"
    >
      <template #footer>
        <UiButton variant="outline" @click="modalOpen = false">取消</UiButton>
        <UiButton :loading="submitting" :disabled="!valid" @click="submitConclusion">
          提交结论
        </UiButton>
      </template>
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
            <a-radio-button :value="SpotCheckConclusionCode.PASSED">一致通过</a-radio-button>
            <a-radio-button :value="SpotCheckConclusionCode.ABNORMAL">判分异常</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          v-if="form.conclusion === SpotCheckConclusionCode.ABNORMAL"
          label="抽检评分（可选）"
        >
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
              form.conclusion === SpotCheckConclusionCode.ABNORMAL
                ? '判分异常时请填写依据（500 字内）'
                : '可选：填写一致通过的简要说明'
            "
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  MyPendingSpotCheckItemResponse,
  SpotCheckStatusCode,
} from '@/apis/mark/marking-quality'
import {
  countMyPendingSpotChecks,
  handleSpotCheck,
  listMyPendingSpotChecks,
  SPOT_CHECK_STATUS_TONE,
  SpotCheckConclusionCode,
  SpotCheckStatusDescription,
} from '@/apis/mark/marking-quality'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingSpotCheck' })

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const pendingItems = ref<MyPendingSpotCheckItemResponse[]>([])
const pendingCount = ref(0)
const loading = ref(false)
const pagination = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const spotCheckSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'pending',
    label: '待处理',
    value: pendingCount.value,
    unit: '条',
    tone: pendingCount.value > 0 ? 'orange' : 'green',
  },
])

function buildSpotCheckExamFilter(): string | undefined {
  return selectedExamId.value || undefined
}

async function loadPendingCount(): Promise<void> {
  const result = await countMyPendingSpotChecks({
    examId: buildSpotCheckExamFilter(),
  })
  pendingCount.value = result.pendingCount
}

async function loadList(): Promise<void> {
  loading.value = true
  try {
    const [page] = await Promise.all([
      listMyPendingSpotChecks({
        examId: buildSpotCheckExamFilter(),
        pageNum: pagination.pageNum,
        pageSize: pagination.pageSize,
      }),
      loadPendingCount(),
    ])
    pendingItems.value = page.list
    pagination.total = page.total
    pagination.pageNum = page.pageNum ?? pagination.pageNum
    pagination.pageSize = page.pageSize ?? pagination.pageSize
  } catch (error) {
    showUserError(error, '待处理阅卷抽检加载失败')
    pendingItems.value = []
    pagination.total = 0
    pendingCount.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: { current: number; pageSize: number }): void {
  pagination.pageNum = page.current
  pagination.pageSize = page.pageSize
  void loadList()
}

const columns: ColumnType<MyPendingSpotCheckItemResponse>[] = [
  { title: '考试', key: 'examId', width: 220, ellipsis: true, fixed: 'left' },
  { title: '题目', key: 'question', width: 240 },
  { title: '抽检前教师复核评分', key: 'originalScore', width: 160, align: 'right' },
  { title: '抽检状态', key: 'spotCheckStatus', width: 110 },
  { title: '分派时间', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 120 },
]

function statusTone(status: SpotCheckStatusCode): BadgeTone {
  return strictEnumTone(SPOT_CHECK_STATUS_TONE, status, '抽检状态')
}

function statusLabel(status: SpotCheckStatusCode): string {
  return strictEnumLabel(SpotCheckStatusDescription, status, '抽检状态')
}

function formatScore(value: number): string {
  return value.toFixed(2)
}

const modalOpen = ref(false)
const submitting = ref(false)
const targetItem = ref<MyPendingSpotCheckItemResponse | null>(null)

interface SpotCheckForm {
  conclusion: SpotCheckConclusionCode
  reviewScore: number | undefined
  handleNote: string
}

const form = reactive<SpotCheckForm>({
  conclusion: SpotCheckConclusionCode.PASSED,
  reviewScore: undefined,
  handleNote: '',
})

const valid = computed(() => Boolean(targetItem.value?.id && form.conclusion))

function buildSpotCheckActions(_item: MyPendingSpotCheckItemResponse): UiTableRowActionItem[] {
  return [{ key: 'handle', label: '处理结论', tone: 'primary' }]
}

function handleSpotCheckAction(key: string, item: MyPendingSpotCheckItemResponse): void {
  if (key === 'handle') {
    openHandleModal(item)
  }
}

function openHandleModal(item: MyPendingSpotCheckItemResponse): void {
  targetItem.value = item
  form.conclusion = SpotCheckConclusionCode.PASSED
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
    modalOpen.value = false
    targetItem.value = null
    await loadList()
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

watch(selectedExamId, () => {
  void loadList()
})

onMounted(async () => {
  await loadList()
})

onActivated(() => {
  void loadList()
})
</script>

<style lang="scss" scoped>
.spot-check-page {
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
}
</style>
