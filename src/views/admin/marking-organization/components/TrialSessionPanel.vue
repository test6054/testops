<template>
  <UiCard class="session-card">
    <template #title>
      <ExperimentOutlined />
      <span>试评会话</span>
      <UiBadge tone="orange">校准评分尺度</UiBadge>
    </template>

    <a-form layout="vertical" class="session-form">
      <a-form-item label="选择题组" required>
        <a-select
          v-model:value="trialGroupId"
          placeholder="选择参加试评的题组"
          :options="groupOptions"
        />
      </a-form-item>
      <UiButton :disabled="!trialGroupId" :loading="creating" @click="submitCreate">
        <template #icon><PlusOutlined /></template>
        创建试评会话
      </UiButton>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">校准结论</h4>
    <a-form layout="vertical" class="session-form">
      <a-form-item label="试评会话" required>
        <a-select
          v-model:value="calibrateSessionId"
          placeholder="选择待校准的试评会话"
          :options="trialSessionOptions"
          show-search
          option-filter-prop="label"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="校准结果（JSON）">
        <a-textarea
          v-model:value="calibrateForm.calibrationResult"
          :rows="3"
          :maxlength="2000"
          placeholder="可选，例如 {&quot;deltaThreshold&quot;:0.2,&quot;notes&quot;:&quot;...&quot;}"
          show-count
        />
      </a-form-item>
      <a-form-item label="讨论笔记">
        <a-textarea
          v-model:value="calibrateForm.discussionNotes"
          :rows="3"
          :maxlength="1000"
          placeholder="可选，团队讨论与共识"
          show-count
        />
      </a-form-item>
      <UiButton :disabled="!calibrateSessionId" :loading="calibrating" @click="submitCalibrate">
        <template #icon><CheckCircleOutlined /></template>
        提交校准结论
      </UiButton>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">试评会话列表</h4>
    <UiEmpty v-if="!sessions.length" description="尚未创建试评会话" />
    <a-list v-else :data-source="sessions" size="small" class="session-history">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <a-typography-text copyable>会话 #{{ (item as TrialSessionVO).id }}</a-typography-text>
              <UiTag
                :tone="TRIAL_STATUS_TONE[(item as TrialSessionVO).sessionStatus]"
                size="sm"
                class="status-tag"
              >
                {{ TRIAL_STATUS_LABEL[(item as TrialSessionVO).sessionStatus] }}
              </UiTag>
            </template>
            <template #description>
              <span>
                题组 #{{ (item as TrialSessionVO).groupId }} · {{ formatDateTime((item as TrialSessionVO).createTime) }}
                <template v-if="(item as TrialSessionVO).closeReason">
                  · 关闭原因：{{ (item as TrialSessionVO).closeReason }}
                </template>
              </span>
            </template>
          </a-list-item-meta>
          <template #actions>
            <UiButton
              v-if="canCloseTrial((item as TrialSessionVO).sessionStatus)"
              variant="outline"
              size="sm"
              @click="emit('open-lifecycle', 'closeTrial', (item as TrialSessionVO).id)"
            >
              <template #icon><StopOutlined /></template>
              关闭试评
            </UiButton>
            <a-popconfirm
              v-if="canDeleteTrial((item as TrialSessionVO).sessionStatus)"
              title="确认删除该试评会话？试评草稿将被软删除，不可恢复。"
              ok-text="删除"
              cancel-text="取消"
              @confirm="submitDelete((item as TrialSessionVO).id)"
            >
              <UiButton
                variant="outline"
                size="sm"
                :loading="deletingId === (item as TrialSessionVO).id"
              >
                <template #icon><DeleteOutlined /></template>
                删除草稿
              </UiButton>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>
  </UiCard>
</template>

<script lang="ts" setup>
import type {
  TrialSessionCalibratePayload,
  TrialSessionStatusCode,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import DeleteOutlined from '@ant-design/icons-vue/DeleteOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import StopOutlined from '@ant-design/icons-vue/StopOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  calibrateTrialSession,
  createTrialSession,
  deleteTrialSession,
  TRIAL_SESSION_STATUS_LABEL as TRIAL_STATUS_LABEL,
  TRIAL_SESSION_STATUS_TONE as TRIAL_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'

interface GroupOption {
  value: string
  label: string
}

defineOptions({ name: 'TrialSessionPanel' })

const props = defineProps<{
  organizationId: string
  groupOptions: GroupOption[]
  sessions: TrialSessionVO[]
}>()

const emit = defineEmits<{
  'refresh': []
  'open-lifecycle': [action: 'closeTrial', sessionId: string]
}>()

const trialGroupId = ref<string | undefined>(undefined)
const creating = ref(false)
const calibrateSessionId = ref<string | undefined>(undefined)
const calibrateForm = reactive<Pick<TrialSessionCalibratePayload, 'calibrationResult' | 'discussionNotes'>>({
  calibrationResult: '',
  discussionNotes: '',
})
const calibrating = ref(false)
const deletingId = ref<string | null>(null)

const trialSessionOptions = computed(() =>
  props.sessions.map(item => ({
    value: item.id,
    label: `会话 #${item.id}（题组 #${item.groupId}） · ${TRIAL_STATUS_LABEL[item.sessionStatus]}`,
  })),
)

watch(
  () => props.sessions,
  (next) => {
    if (calibrateSessionId.value && !next.some(s => s.id === calibrateSessionId.value)) {
      calibrateSessionId.value = undefined
    }
  },
)

function canCloseTrial(status: TrialSessionStatusCode): boolean {
  return status === 'TRIAL_ASSIGNED'
    || status === 'TRIAL_SUBMITTED'
    || status === 'CALIBRATED'
}

function canDeleteTrial(status: TrialSessionStatusCode): boolean {
  return status === 'TRIAL_CREATED'
}


async function submitCreate(): Promise<void> {
  if (!props.organizationId || !trialGroupId.value) return
  creating.value = true
  try {
    const sessionId = await createTrialSession({
      organizationId: props.organizationId,
      groupId: trialGroupId.value,
    })
    message.success(`试评会话 #${sessionId} 已创建`)
    calibrateSessionId.value = sessionId
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建试评会话失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
}

async function submitCalibrate(): Promise<void> {
  if (!calibrateSessionId.value) return
  calibrating.value = true
  try {
    await calibrateTrialSession({
      sessionId: calibrateSessionId.value,
      calibrationResult: calibrateForm.calibrationResult?.trim() || undefined,
      discussionNotes: calibrateForm.discussionNotes?.trim() || undefined,
    })
    message.success('试评校准结论已提交')
    calibrateForm.calibrationResult = ''
    calibrateForm.discussionNotes = ''
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '校准提交失败'
    message.error(errMsg)
  } finally {
    calibrating.value = false
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  deletingId.value = sessionId
  try {
    await deleteTrialSession(sessionId)
    message.success('试评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '删除试评会话失败'
    message.error(errMsg)
  } finally {
    deletingId.value = null
  }
}
</script>

<style lang="scss" scoped>
.session-card {
  height: 100%;
}

.session-form {
  max-width: 100%;
}

.section-divider {
  margin: 16px 0;
}

.subsection-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.session-history {
  max-height: 240px;
  overflow-y: auto;
}

.status-tag {
  margin-left: 8px;
}
</style>
