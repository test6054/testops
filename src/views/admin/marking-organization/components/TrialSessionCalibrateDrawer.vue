<template>
  <UiDrawer
    :open="open"
    title="提交校准结论"
    :width="720"
    :confirm-loading="submitting === true"
    ok-text="提交"
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <div v-if="session" class="trial-calibrate-drawer__meta">
      <UiTag tone="blue" size="sm">{{ session.groupName }}</UiTag>
      <UiTag
        :tone="strictEnumTone(TRIAL_SESSION_STATUS_TONE, session.sessionStatus, '试评会话状态')"
        size="sm"
      >
        {{ strictEnumLabel(TrialSessionStatusDescription, session.sessionStatus, '试评会话状态') }}
      </UiTag>
    </div>

    <UiAlertStrip
      v-if="loadError"
      tone="error"
      :message="loadError"
      class="trial-calibrate-drawer__alert"
    />
    <UiAlertStrip
      v-else-if="consistency && consistency.calibratable !== true"
      tone="warning"
      :message="consistency.blockedReason"
      class="trial-calibrate-drawer__alert"
    />
    <UiAlertStrip
      v-else-if="consistency && consistency.requireAcknowledgeDivergences === true"
      tone="warning"
      message="已发现评分标准分歧样本，须完成教研讨论并勾认后才能提交校准"
      class="trial-calibrate-drawer__alert"
    />

    <div v-if="consistency" class="trial-calibrate-drawer__kpi">
      <span>可比样本 {{ consistency.comparableSampleCount }}</span>
      <span>分歧样本 {{ consistency.divergentSampleCount }}</span>
      <span>
        一致性
        {{ consistency.consistencyRate == null ? '—' : `${consistency.consistencyRate}%` }}
      </span>
      <span>
        最大分差
        {{ consistency.maxScoreSpread == null ? '—' : consistency.maxScoreSpread }}
      </span>
    </div>

    <div v-if="consistency && consistency.samples.length > 0" class="trial-calibrate-drawer__table-wrap">
      <table class="trial-calibrate-drawer__table">
        <thead>
          <tr>
            <th>样本</th>
            <th>教师给分</th>
            <th class="is-num">分差</th>
            <th>判定</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sample in consistency.samples" :key="sample.sampleKey">
            <td>
              <UiTypographyText>
                {{ sample.questionNo ? `题 ${sample.questionNo}` : `答卷 ${sample.paperInstanceId}` }}
              </UiTypographyText>
              <span class="dp-text-muted-xs">满分 {{ sample.sampleFullScore }}</span>
            </td>
            <td>
              <span
                v-for="score in sample.reviewerScores"
                :key="score.taskId"
                class="trial-calibrate-drawer__score"
              >
                {{ score.reviewerName }} {{ score.score }}
              </span>
            </td>
            <td class="is-num">{{ sample.scoreSpread }}</td>
            <td>
              <UiTag :tone="sample.divergent === true ? 'orange' : 'green'" size="sm">
                {{ sample.divergent === true ? '分歧' : '一致' }}
              </UiTag>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiForm layout="vertical" class="trial-calibrate-drawer__form">
      <UiFormItem
        label="校准结论"
        required
        :validate-status="summaryFieldError ? 'error' : undefined"
        :help="summaryFieldError || undefined"
      >
        <UiTextarea
          ref="summaryInputRef"
          size="sm"
          v-model="calibrationSummary"
          :rows="4"
          :maxlength="1000"
          placeholder="填写本次试评形成的评分尺度、扣分边界和执行口径"
          :show-count="true"
        />
      </UiFormItem>
      <UiFormItem
        label="讨论笔记"
        :required="consistency?.requireAcknowledgeDivergences === true"
        :validate-status="notesFieldError ? 'error' : undefined"
        :help="notesFieldError || undefined"
      >
        <UiTextarea
          size="sm"
          v-model="discussionNotes"
          :rows="4"
          :maxlength="1000"
          placeholder="存在分歧时必填：记录分歧样本、讨论结论与统一扣分口径"
          :show-count="true"
        />
      </UiFormItem>
      <UiFormItem v-if="consistency?.requireAcknowledgeDivergences === true">
        <UiCheckbox v-model="acknowledgeScoreDivergences">
          已就评分分歧样本完成教研讨论并达成执行口径
        </UiCheckbox>
      </UiFormItem>
    </UiForm>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type {
  TrialCalibrationConsistencyResponse,
  TrialSessionResponse,
} from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import {
  calibrateTrialSession,
  getTrialCalibrationConsistency,
  TRIAL_SESSION_STATUS_TONE,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TrialSessionCalibrateDrawer' })

const props = withDefaults(
  defineProps<{
    open: boolean
    session: TrialSessionResponse | null
    canManage?: boolean
  }>(),
  {
    canManage: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const calibrationSummary = ref('')
const discussionNotes = ref('')
const acknowledgeScoreDivergences = ref(false)
const submitting = ref(false)
const loadingConsistency = ref(false)
const loadError = ref('')
const summaryFieldError = ref('')
const notesFieldError = ref('')
const consistency = ref<TrialCalibrationConsistencyResponse | null>(null)
const summaryInputRef = ref<{ focus?: () => void } | null>(null)

watch(
  () => props.open,
  async (nextOpen) => {
    if (!nextOpen) {
      calibrationSummary.value = ''
      discussionNotes.value = ''
      acknowledgeScoreDivergences.value = false
      summaryFieldError.value = ''
      notesFieldError.value = ''
      consistency.value = null
      loadError.value = ''
      return
    }
    await loadConsistency()
  },
)

watch(calibrationSummary, () => {
  summaryFieldError.value = ''
})

watch(discussionNotes, () => {
  notesFieldError.value = ''
})

async function loadConsistency(): Promise<void> {
  if (!props.session?.id) {
    loadError.value = '缺少试评会话，无法加载评分一致性'
    consistency.value = null
    return
  }
  loadingConsistency.value = true
  loadError.value = ''
  consistency.value = null
  try {
    consistency.value = await getTrialCalibrationConsistency(props.session.id)
  } catch (error) {
    loadError.value = '加载试评评分一致性失败'
    showUserError(error, '加载试评评分一致性失败')
  } finally {
    loadingConsistency.value = false
  }
}

async function submit(): Promise<void> {
  if (props.canManage !== true) {
    showFormValidationMessage('仅考试主考老师可管理试评会话')
    return
  }
  const status = props.session?.sessionStatus
  if (
    status !== TrialSessionStatusCode.TRIAL_ASSIGNED
    && status !== TrialSessionStatusCode.TRIAL_SUBMITTED
  ) {
    showFormValidationMessage('当前试评会话状态不可提交校准')
    return
  }
  if (!props.session?.id) {
    showFormValidationMessage('缺少试评会话，无法提交校准')
    return
  }
  if (consistency.value?.calibratable !== true) {
    showFormValidationMessage(consistency.value?.blockedReason || '当前不可提交校准')
    return
  }
  if (!calibrationSummary.value.trim()) {
    summaryFieldError.value = '请填写校准结论'
    showFormValidationMessage('请填写校准结论')
    summaryInputRef.value?.focus?.()
    return
  }
  if (consistency.value.requireAcknowledgeDivergences === true) {
    if (!discussionNotes.value.trim()) {
      notesFieldError.value = '存在评分分歧时必须填写讨论记录'
      showFormValidationMessage('存在评分分歧时必须填写讨论记录')
      return
    }
    if (acknowledgeScoreDivergences.value !== true) {
      showFormValidationMessage('请确认已就评分分歧完成教研讨论')
      return
    }
  }
  if (submitting.value === true || loadingConsistency.value === true) {
    return
  }
  submitting.value = true
  try {
    await calibrateTrialSession({
      sessionId: props.session.id,
      calibrationSummary: calibrationSummary.value.trim(),
      discussionNotes: discussionNotes.value.trim() || undefined,
      acknowledgeScoreDivergences:
        consistency.value.requireAcknowledgeDivergences === true
          ? true
          : undefined,
    })
    void message.success('试评校准结论已提交')
    emit('update:open', false)
    emit('success')
  } catch (error) {
    showUserError(error, '提交试评校准结论失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.trial-calibrate-drawer {
  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-block);
  }

  &__alert {
    margin-bottom: var(--dp-space-block);
  }

  &__kpi {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-block);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
  }

  &__table-wrap {
    margin-bottom: var(--dp-space-block);
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--dp-font-size-sm);

    th,
    td {
      padding: var(--dp-space-component-tight) var(--dp-space-component);
      border-bottom: 1px solid var(--dp-border);
      text-align: left;
      vertical-align: top;
    }

    th.is-num,
    td.is-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }

  &__score {
    display: block;
    color: var(--dp-text-secondary);
  }

  &__form {
    margin-top: var(--dp-space-component-xs);
  }
}
</style>
