<script setup lang="ts">
import type { Dayjs } from 'dayjs'
import type {
  IndirectEvaluationFormPublishRequest,
  IndirectEvaluationFormVO,
  IndirectEvaluationProgressVO,
  IndirectEvaluationStatisticsVO,
} from '@/apis/quality/indirect-form'
import type { IndirectFormAccessMode, IndirectFormStatus } from '@/apis/quality/types'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { reactive, ref } from 'vue'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import {
  accessModeOptions,
  buildPublicSurveyUrl,
  canCloseForm,
  canShowWorkflowInsights,
  DEFAULT_IDENTITY_FIELDS,
  formStatusLabel,
} from './indirect-evaluation-shared'

const props = defineProps<{
  selectedForm: IndirectEvaluationFormVO | null
}>()

const emit = defineEmits<{
  'forms-reloaded': [formId?: string]
}>()

const publishDrawerVisible = ref(false)
const publishSubmitting = ref(false)
const publishTargetForm = ref<IndirectEvaluationFormVO | null>(null)
const publishTimeRange = ref<[Dayjs, Dayjs] | undefined>(undefined)
const publishEditor = reactive<IndirectEvaluationFormPublishRequest>({
  id: '',
  startTime: '',
  endTime: '',
  accessMode: 'PUBLIC_LINK',
  allowAnonymous: false,
  requireIdentityFields: [...DEFAULT_IDENTITY_FIELDS],
  maxSubmissionsPerRespondent: 1,
  welcomeMessage: '',
  thankYouMessage: '',
})
const publishResultUrl = ref('')

const progressDrawerVisible = ref(false)
const progressLoading = ref(false)
const progressData = ref<IndirectEvaluationProgressVO | null>(null)

const statisticsDrawerVisible = ref(false)
const statisticsLoading = ref(false)
const statisticsData = ref<IndirectEvaluationStatisticsVO | null>(null)

/** 打开发布抽屉并初始化默认填写窗口与身份字段 */
function openPublishDrawer(record: IndirectEvaluationFormVO) {
  publishTargetForm.value = record
  publishResultUrl.value = ''
  const start = dayjs()
  const end = dayjs().add(14, 'day')
  publishTimeRange.value = [start, end]
  Object.assign(publishEditor, {
    id: record.id,
    startTime: start.format('YYYY-MM-DD HH:mm:ss'),
    endTime: end.format('YYYY-MM-DD HH:mm:ss'),
    accessMode: 'PUBLIC_LINK' as IndirectFormAccessMode,
    allowAnonymous: false,
    requireIdentityFields: [...DEFAULT_IDENTITY_FIELDS],
    maxSubmissionsPerRespondent: 1,
    welcomeMessage: record.description ?? '',
    thankYouMessage: '感谢您的填写。',
  })
  publishDrawerVisible.value = true
}

/** 提交问卷发布请求，成功后刷新台账并回传填答链接 */
async function submitPublish() {
  if (!publishTargetForm.value) return
  if (!publishTimeRange.value) {
    message.error('请设置问卷填写时间窗口')
    return
  }
  publishEditor.startTime = publishTimeRange.value[0].format('YYYY-MM-DD HH:mm:ss')
  publishEditor.endTime = publishTimeRange.value[1].format('YYYY-MM-DD HH:mm:ss')
  if (!publishEditor.allowAnonymous && (!publishEditor.requireIdentityFields?.length)) {
    message.error('非匿名问卷必须配置身份字段')
    return
  }
  publishSubmitting.value = true
  try {
    const result = await indirectFormApi.publish({
      ...publishEditor,
      requireIdentityFields: publishEditor.allowAnonymous ? [] : publishEditor.requireIdentityFields,
    })
    publishResultUrl.value = result.publicUrl.startsWith('http')
      ? result.publicUrl
      : buildPublicSurveyUrl(result.accessToken)
    message.success('问卷已发布')
    emit('forms-reloaded', publishTargetForm.value.id)
  } catch (error) {
    showUserError(error, '问卷发布失败')
  } finally {
    publishSubmitting.value = false
  }
}

/** 关闭已发布问卷，停止接受新填答 */
async function handleCloseForm(record: IndirectEvaluationFormVO) {
  void confirmAsync({
    title: `关闭问卷「${record.formName}」？`,
    content: '关闭后将停止接受新的填答。',
    type: 'warning',
    onOk: async () => {
      await indirectFormApi.close(record.id)
      message.success('问卷已关闭')
      emit('forms-reloaded', record.id)
    },
  })
}

/** 加载并展示问卷填写进度 */
async function openProgressDrawer(record: IndirectEvaluationFormVO) {
  progressDrawerVisible.value = true
  progressLoading.value = true
  progressData.value = null
  try {
    progressData.value = await indirectFormApi.progress(record.id)
  } catch (error) {
    showUserError(error, '问卷进度加载失败')
    progressDrawerVisible.value = false
  } finally {
    progressLoading.value = false
  }
}

/** 加载并展示问卷统计分析 */
async function openStatisticsDrawer(record: IndirectEvaluationFormVO) {
  statisticsDrawerVisible.value = true
  statisticsLoading.value = true
  statisticsData.value = null
  try {
    statisticsData.value = await indirectFormApi.statistics(record.id)
  } catch (error) {
    showUserError(error, '问卷统计加载失败')
    statisticsDrawerVisible.value = false
  } finally {
    statisticsLoading.value = false
  }
}

/** 复制公开填答链接到剪贴板 */
async function copySurveyLink(record: IndirectEvaluationFormVO) {
  if (!record.accessToken) {
    message.error('问卷尚未发布，无法复制填答链接')
    return
  }
  const url = buildPublicSurveyUrl(record.accessToken)
  try {
    await navigator.clipboard.writeText(url)
    message.success('填答链接已复制')
  } catch {
    message.error(`复制失败，请手动复制：${url}`)
  }
}

defineExpose({
  openPublishDrawer,
  handleCloseForm,
  openProgressDrawer,
  openStatisticsDrawer,
  copySurveyLink,
})
</script>

<template>
  <UiCard
    v-if="selectedForm && canShowWorkflowInsights(selectedForm)"
    class="ie__workflow-card"
  >
    <template #title>问卷运行态</template>
    <template #extra>
      <div class="ie__panel-actions">
        <UiButton
          v-if="selectedForm.status === 'PUBLISHED' && selectedForm.accessToken"
          size="sm"
          variant="outline"
          @click="copySurveyLink(selectedForm)"
        >
          复制填答链接
        </UiButton>
        <UiButton size="sm" variant="outline" @click="openProgressDrawer(selectedForm)">
          查看进度
        </UiButton>
        <UiButton size="sm" variant="outline" @click="openStatisticsDrawer(selectedForm)">
          查看统计
        </UiButton>
        <UiButton
          v-if="canCloseForm(selectedForm)"
          size="sm"
          variant="outline"
          @click="handleCloseForm(selectedForm)"
        >
          关闭问卷
        </UiButton>
      </div>
    </template>
    <p class="ie__workflow-line">
      状态：{{ formStatusLabel(selectedForm.status) }}
      <span v-if="selectedForm.startTime"> · 开始 {{ selectedForm.startTime }}</span>
      <span v-if="selectedForm.endTime"> · 截止 {{ selectedForm.endTime }}</span>
    </p>
  </UiCard>

  <UiDrawer
    v-model:open="publishDrawerVisible"
    title="发布间接评价问卷"
    width="560"
    :confirm-loading="publishSubmitting"
    @ok="submitPublish"
  >
    <a-form layout="vertical">
      <a-form-item label="填写时间窗口" required>
        <a-range-picker
          v-model:value="publishTimeRange"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="访问模式" required>
        <a-select v-model:value="publishEditor.accessMode" :options="accessModeOptions" />
      </a-form-item>
      <a-form-item label="允许匿名">
        <a-switch v-model:checked="publishEditor.allowAnonymous" />
      </a-form-item>
      <a-form-item label="每人最大提交次数" required>
        <a-input-number
          v-model:value="publishEditor.maxSubmissionsPerRespondent"
          :min="1"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="欢迎语">
        <a-textarea v-model:value="publishEditor.welcomeMessage" :rows="2" />
      </a-form-item>
      <a-form-item label="感谢语">
        <a-textarea v-model:value="publishEditor.thankYouMessage" :rows="2" />
      </a-form-item>
      <p v-if="publishResultUrl" class="indirect-evaluation__publish-url">
        填答链接：{{ publishResultUrl }}
      </p>
    </a-form>
  </UiDrawer>

  <UiDrawer v-model:open="progressDrawerVisible" title="问卷填写进度" width="480" hide-footer>
    <a-spin :spinning="progressLoading">
      <template v-if="progressData">
        <p>问卷：{{ progressData.formName }}</p>
        <p>状态：{{ formStatusLabel(progressData.status as IndirectFormStatus | undefined) }}</p>
        <p>提交份数：{{ progressData.submissionCount }} / 有效 {{ progressData.validCount }}</p>
        <p v-if="progressData.expectedSample">期望样本：{{ progressData.expectedSample }}</p>
        <p v-if="progressData.completionRate != null">
          完成率：{{ progressData.completionRate }}%
        </p>
      </template>
    </a-spin>
  </UiDrawer>

  <UiDrawer v-model:open="statisticsDrawerVisible" title="问卷统计分析" width="720" hide-footer>
    <a-spin :spinning="statisticsLoading">
      <template v-if="statisticsData">
        <p>
          总样本：{{ statisticsData.overallSampleCount }}
          <span v-if="statisticsData.overallScore != null">
            · 综合换算分 {{ statisticsData.overallScore }}
          </span>
        </p>
        <UiDataTable
          pagination-mode="none"
          :columns="[
            { title: '题项', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
            { title: '题干', dataIndex: 'itemText', key: 'itemText' },
            { title: '有效样本', dataIndex: 'validCount', key: 'validCount', width: 100 },
            { title: '均值', dataIndex: 'mean', key: 'mean', width: 80 },
            { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 90 },
          ]"
          :data-source="statisticsData.items"
          row-key="itemId"
          :show-pagination="false"
          flat
          :total="statisticsData.items.length"
        />
      </template>
    </a-spin>
  </UiDrawer>
</template>

<style scoped lang="scss">
.ie {
  &__workflow-card {
    margin-bottom: 12px;
  }

  &__workflow-line {
    margin: 0;
    color: var(--dp-text-muted);
    font-size: 13px;
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}
</style>
