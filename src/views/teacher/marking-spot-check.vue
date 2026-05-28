<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="spot-check-page__context">
        <div class="spot-check-page__context-left">
          <a-select
            :value="selectedExamId"
            class="spot-check-page__exam-select"
            placeholder="按考试过滤（不选则查全部）"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag :tone="pendingItems.length > 0 ? 'orange' : 'green'" size="sm">
            待处理 {{ pendingItems.length }}
          </UiTag>
        </div>
        <div class="spot-check-page__context-right">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiAlertStrip
      tone="info"
      title="抽检处理说明"
      description="此处展示当前账号作为「被抽检教师」尚未处理或处理中的抽检记录。点击行尾「处理结论」可直接完成结论提交。"
      dense
      class="spot-check-page__alert"
    />

    <UiCard class="info-card">
      <template #title>
        <AimOutlined />
        <span>我的待处理抽检</span>
        <UiBadge :tone="pendingItems.length > 0 ? 'orange' : 'gray'">
          {{ pendingItems.length }}
        </UiBadge>
      </template>

      <!-- D-9 错误态：待处理抽检加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="listLoadError"
        :error="listLoadError"
        title="待处理抽检加载失败"
        compact
        @retry="loadList"
      />
      <UiEmpty
        v-else-if="!loading && pendingItems.length === 0"
        description="当前没有待处理的抽检任务"
      />

      <UiDataTable
        v-else
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
          <template v-else-if="column.key === 'questionTemplateId'">
            <span>第 {{ pendingItems[index].questionNo }} 题</span>
            <div class="spot-check-page__sub">
              模板 #{{ pendingItems[index].questionTemplateId }}
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
            <UiButton size="sm" @click="openHandleModal(pendingItems[index])"> 处理结论 </UiButton>
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
        <a-descriptions-item label="抽检记录ID">{{ targetItem.id }}</a-descriptions-item>
        <a-descriptions-item label="考试">
          {{ targetItem.examName }}（{{ targetItem.examNo }}）
        </a-descriptions-item>
        <a-descriptions-item label="题目模板ID">
          第 {{ targetItem.questionNo }} 题（模板 #{{ targetItem.questionTemplateId }}）
        </a-descriptions-item>
        <a-descriptions-item label="试卷实例ID">
          {{ targetItem.paperInstanceId }}
        </a-descriptions-item>
        <a-descriptions-item label="教师原分">
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

        <a-form-item v-if="form.conclusion === 'ABNORMAL'" label="组长建议分（可选）">
          <a-input-number
            v-model:value="form.suggestedScore"
            :min="0"
            :step="0.5"
            class="spot-check-page__field-full"
            placeholder="如认为该题应给分，填入建议分"
          />
        </a-form-item>

        <a-form-item label="处理说明">
          <a-textarea
            v-model:value="form.handleNote"
            :rows="4"
            :placeholder="
              form.conclusion === 'ABNORMAL'
                ? '判分异常时建议填写依据（500 字内）'
                : '可选：填写一致通过的简要说明'
            "
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  MyPendingSpotCheckItemVO,
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
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingSpotCheck' })

// ─── 考试选择器（可选过滤；不选 = 跨考试聚合） ──────────────
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExams,
} = useMarkExamSelector()

// ─── 待处理抽检列表 ──────────────────────────────────────
const pendingItems = ref<MyPendingSpotCheckItemVO[]>([])
const loading = ref(false)
// D-9 错误态：待处理抽检加载失败时 UiErrorRetryPanel 重试 + 上报
const listLoadError = ref<unknown>(null)

async function loadList(): Promise<void> {
  loading.value = true
  listLoadError.value = null
  try {
    pendingItems.value = await listMyPendingSpotChecks({
      examId: selectedExamId.value || undefined,
    })
  } catch (error) {
    listLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载待处理抽检失败')
    pendingItems.value = []
  } finally {
    loading.value = false
  }
}

const columns: ColumnType<MyPendingSpotCheckItemVO>[] = [
  { title: '考试', key: 'examId', width: 220, ellipsis: true },
  { title: '题目', key: 'questionTemplateId', width: 150 },
  { title: '教师原分', key: 'originalScore', width: 110, align: 'right' },
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
const targetItem = ref<MyPendingSpotCheckItemVO | null>(null)

// a-input-number v-model:value 不接受 null，未填状态统一用 undefined
interface SpotCheckForm {
  conclusion: SpotCheckConclusionCode
  suggestedScore: number | undefined
  handleNote: string
}

const form = reactive<SpotCheckForm>({
  conclusion: 'PASSED',
  suggestedScore: undefined,
  handleNote: '',
})

const valid = computed(() => Boolean(targetItem.value?.id && form.conclusion))

function openHandleModal(item: MyPendingSpotCheckItemVO): void {
  targetItem.value = item
  form.conclusion = 'PASSED'
  form.suggestedScore = undefined
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
      suggestedScore: form.suggestedScore,
      handleNote: form.handleNote.trim() || undefined,
    })
    message.success('已提交抽检处理结论')
    // 从本地列表移除已处理项，避免重复显示直至下次 loadList
    pendingItems.value = pendingItems.value.filter((item) => item.id !== targetItem.value?.id)
    modalOpen.value = false
    targetItem.value = null
  } catch (error) {
    message.error(error instanceof Error ? error.message : '处理抽检结论失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await initExams()
  await loadList()
})
</script>

<style lang="scss" scoped>
.spot-check-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__exam-select {
    width: 280px;
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
