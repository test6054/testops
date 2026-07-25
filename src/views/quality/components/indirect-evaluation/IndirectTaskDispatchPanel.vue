<script setup lang="ts">
import type {
  IndirectEvaluationFormPublishRequest,
  IndirectEvaluationFormVO,
  IndirectEvaluationItemStatisticsVO,
  IndirectEvaluationProgressVO,
  IndirectEvaluationStatisticsVO,
  TargetWeightedScoreVO,
} from '@/apis/quality/indirect-form'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import { IndirectFormAccessModeCode } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUserStore } from '@/stores'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import {
  accessModeOptions,
  buildPublicSurveyUrl,
  canCloseForm,
  canShowWorkflowInsights,
  DEFAULT_IDENTITY_FIELDS,
  formatIndirectItemWeightDisplay,
  formStatusLabel,
} from './indirect-evaluation-shared'

const props = defineProps<{
  selectedForm: IndirectEvaluationFormVO | null
}>()

const emit = defineEmits<{
  'forms-reloaded': [formId?: string]
}>()

const router = useRouter()
const userStore = useUserStore()

const publishDrawerVisible = ref(false)
const publishSubmitting = ref(false)
const publishTargetForm = ref<IndirectEvaluationFormVO | null>(null)
const publishTimeRange = ref<[string, string] | undefined>(undefined)
const publishEditor = reactive<IndirectEvaluationFormPublishRequest>({
  id: '',
  startTime: '',
  endTime: '',
  accessMode: IndirectFormAccessModeCode.PUBLIC_LINK,
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
const workflowProgress = ref<IndirectEvaluationProgressVO | null>(null)
const workflowProgressLoading = ref(false)

const statisticsDrawerVisible = ref(false)
const statisticsLoading = ref(false)
const statisticsData = ref<IndirectEvaluationStatisticsVO | null>(null)
const statisticsItems = ref<IndirectEvaluationItemStatisticsVO[]>([])
const statisticsItemTotal = ref(0)
const statisticsItemPageNum = ref(1)
const statisticsItemPageSize = ref(20)
const statisticsFormId = ref('')
const exportContributing = ref(false)

const WEIGHTED_ATTAINMENT_NOTICE_KEY_PREFIX = 'quality-indirect-weighted-attainment-notice-v1'
const weightedAttainmentNoticeVisible = ref(false)

function weightedAttainmentNoticeStorageKey(): string {
  const tenantId = userStore.userInfo?.tenantId
  if (!tenantId) {
    return WEIGHTED_ATTAINMENT_NOTICE_KEY_PREFIX
  }
  return `${WEIGHTED_ATTAINMENT_NOTICE_KEY_PREFIX}-${tenantId}`
}

function maybeShowWeightedAttainmentNotice() {
  if (localStorage.getItem(weightedAttainmentNoticeStorageKey()) === '1') {
    weightedAttainmentNoticeVisible.value = false
    return
  }
  weightedAttainmentNoticeVisible.value = true
}

function dismissWeightedAttainmentNotice() {
  weightedAttainmentNoticeVisible.value = false
  localStorage.setItem(weightedAttainmentNoticeStorageKey(), '1')
}

/** 关闭统计抽屉并跳转题项加权说明页，保留问卷上下文供返回统计 */
function openWeightedAttainmentHelp() {
  const formId = statisticsFormId.value || props.selectedForm?.id
  statisticsDrawerVisible.value = false
  void router.push({
    name: 'QualityHelpIndirectWeightedAttainment',
    query: formId
      ? {
          formId,
          from: 'statistics',
        }
      : undefined,
  })
}

/** 打开发布抽屉并初始化默认填写窗口与身份字段 */
function openPublishDrawer(record: IndirectEvaluationFormVO) {
  publishTargetForm.value = record
  publishResultUrl.value = ''
  const start = dayjs()
  const end = dayjs().add(14, 'day')
  publishTimeRange.value = [start.format('YYYY-MM-DD HH:mm:ss'), end.format('YYYY-MM-DD HH:mm:ss')]
  Object.assign(publishEditor, {
    id: record.id,
    startTime: start.format('YYYY-MM-DD HH:mm:ss'),
    endTime: end.format('YYYY-MM-DD HH:mm:ss'),
    accessMode: IndirectFormAccessModeCode.PUBLIC_LINK,
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
    void message.error('请设置问卷填写时间窗口')
    return
  }
  publishEditor.startTime = publishTimeRange.value[0]
  publishEditor.endTime = publishTimeRange.value[1]
  if (!publishEditor.allowAnonymous && !publishEditor.requireIdentityFields?.length) {
    void message.error('非匿名问卷必须配置身份字段')
    return
  }
  publishSubmitting.value = true
  try {
    const result = await indirectFormApi.publish({
      ...publishEditor,
      requireIdentityFields: publishEditor.allowAnonymous
        ? []
        : publishEditor.requireIdentityFields,
    })
    publishResultUrl.value = result.publicUrl.startsWith('http')
      ? result.publicUrl
      : buildPublicSurveyUrl(result.accessToken)
    void message.success('问卷已发布')
    emit('forms-reloaded', publishTargetForm.value.id)
    void loadWorkflowProgress(publishTargetForm.value.id)
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
      void message.success('问卷已关闭')
      emit('forms-reloaded', record.id)
      void loadWorkflowProgress(record.id)
    },
  })
}

/** 加载问卷运行态进度摘要，供卡片角标与进度抽屉复用 */
async function loadWorkflowProgress(formId: string) {
  workflowProgressLoading.value = true
  try {
    workflowProgress.value = await indirectFormApi.progress(formId)
  } catch {
    workflowProgress.value = null
  } finally {
    workflowProgressLoading.value = false
  }
}

watch(
  () => props.selectedForm,
  (form) => {
    workflowProgress.value = null
    if (form && canShowWorkflowInsights(form)) {
      void loadWorkflowProgress(form.id)
    }
  },
  { immediate: true },
)

/** 加载并展示问卷填写进度 */
async function openProgressDrawer(record: IndirectEvaluationFormVO) {
  progressDrawerVisible.value = true
  progressLoading.value = true
  progressData.value = null
  try {
    progressData.value = await indirectFormApi.progress(record.id)
    workflowProgress.value = progressData.value
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
  statisticsItems.value = []
  statisticsItemTotal.value = 0
  statisticsFormId.value = record.id
  statisticsItemPageNum.value = 1
  weightedAttainmentNoticeVisible.value = false
  try {
    statisticsData.value = await indirectFormApi.statistics(record.id)
    await loadStatisticsItems()
    maybeShowWeightedAttainmentNotice()
  } catch (error) {
    showUserError(error, '问卷统计加载失败')
    statisticsDrawerVisible.value = false
  } finally {
    statisticsLoading.value = false
  }
}

async function loadStatisticsItems() {
  if (!statisticsFormId.value) return
  statisticsLoading.value = true
  try {
    const page = await indirectFormApi.statisticsItemPage({
      formId: statisticsFormId.value,
      pageNum: statisticsItemPageNum.value,
      pageSize: statisticsItemPageSize.value,
    })
    statisticsItems.value = page.list
    statisticsItemTotal.value = page.total
  } catch (error) {
    statisticsItems.value = []
    statisticsItemTotal.value = 0
    showUserError(error, '题项统计加载失败')
  } finally {
    statisticsLoading.value = false
  }
}

function handleStatisticsItemPageChange(page: { current: number, pageSize: number }) {
  statisticsItemPageNum.value = page.current
  statisticsItemPageSize.value = page.pageSize
  void loadStatisticsItems()
}

function showTargetScoreCards(targetScores?: TargetWeightedScoreVO[]): boolean {
  return (targetScores?.length ?? 0) > 0
}

function formatDirectIndirectWeights(
  directWeight?: number,
  indirectWeight?: number,
): string | null {
  if (directWeight == null && indirectWeight == null) return null
  const direct = directWeight == null ? '-' : String(directWeight)
  const indirect = indirectWeight == null ? '-' : String(indirectWeight)
  return `${direct} / ${indirect}`
}

function openAchievementDetail(target: TargetWeightedScoreVO) {
  if (!target.achievementResultId) return
  router.push({
    name: 'QualityAchievementDetail',
    params: { resultId: target.achievementResultId },
  })
}

/** 导出间接评价认证明细 Excel（Phase C / C20） */
async function exportContribution() {
  if (!statisticsFormId.value) return
  exportContributing.value = true
  try {
    const result = await indirectFormApi.exportContribution(statisticsFormId.value)
    await handleDownloadFile({ fileId: result.fileNodeId, fileName: result.fileName })
    if (result.staleFlag && result.staleMessage) {
      void message.warning(result.staleMessage)
    }
    void message.success(`已导出 ${result.rowCount} 行认证明细`)
  } catch (error) {
    showUserError(error, '认证明细导出失败')
  } finally {
    exportContributing.value = false
  }
}

/** 复制公开填答链接到剪贴板 */
async function copySurveyLink(record: IndirectEvaluationFormVO) {
  if (!record.accessToken) {
    void message.error('问卷尚未发布，无法复制填答链接')
    return
  }
  const url = buildPublicSurveyUrl(record.accessToken)
  try {
    await navigator.clipboard.writeText(url)
    void message.success('填答链接已复制')
  } catch {
    void message.error('复制失败，请手动复制链接')
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
  <UiCard v-if="selectedForm && canShowWorkflowInsights(selectedForm)" class="ie__workflow-card">
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
      <span v-if="workflowProgressLoading"> · 进度加载中…</span>
      <template v-else-if="workflowProgress">
        <span v-if="workflowProgress.responseCollectionRate != null">
          · 样本回收率 {{ workflowProgress.responseCollectionRate }}%
        </span>
        <span
          v-if="(workflowProgress.pendingConfirmCount ?? 0) > 0"
          class="ie__workflow-pending-confirm"
        >
          · 待确认 {{ workflowProgress.pendingConfirmCount }} 份
        </span>
        <span
          v-if="(workflowProgress.pendingConversionCount ?? 0) > 0"
          class="ie__workflow-pending"
        >
          · 待换算 {{ workflowProgress.pendingConversionCount }} 份
        </span>
        <span
          v-if="(workflowProgress.noSubstantiveCount ?? 0) > 0"
          class="ie__workflow-no-substantive"
        >
          · 无实质作答 {{ workflowProgress.noSubstantiveCount }} 份
        </span>
      </template>
    </p>
  </UiCard>

  <UiDrawer
    v-model:open="publishDrawerVisible"
    title="发布间接评价问卷"
    width="560"
    :confirm-loading="publishSubmitting"
    @ok="submitPublish"
  >
    <UiForm layout="vertical">
      <UiFormItem label="填写时间窗口" required>
        <UiRangePicker
          v-model="publishTimeRange"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </UiFormItem>
      <UiFormItem label="访问模式" required>
        <UiSelect size="sm" v-model="publishEditor.accessMode" :options="accessModeOptions" />
      </UiFormItem>
      <UiFormItem label="允许匿名">
        <UiSwitch size="sm" v-model="publishEditor.allowAnonymous" />
      </UiFormItem>
      <UiFormItem label="每人最大提交次数" required>
        <UiInputNumber
          size="sm"
          v-model="publishEditor.maxSubmissionsPerRespondent"
          :min="1"
          style="width: 100%"
        />
      </UiFormItem>
      <UiFormItem label="欢迎语">
        <UiTextarea size="sm" v-model="publishEditor.welcomeMessage" :rows="2" />
      </UiFormItem>
      <UiFormItem label="感谢语">
        <UiTextarea size="sm" v-model="publishEditor.thankYouMessage" :rows="2" />
      </UiFormItem>
      <p v-if="publishResultUrl" class="indirect-evaluation__publish-url">
        填答链接：{{ publishResultUrl }}
      </p>
    </UiForm>
  </UiDrawer>

  <UiDrawer v-model:open="progressDrawerVisible" title="问卷填写进度" width="480" hide-footer>
    <UiSpin :spinning="progressLoading">
      <template v-if="progressData">
        <p>问卷：{{ progressData.formName }}</p>
        <p>状态：{{ formStatusLabel(progressData.status) }}</p>
        <p>
          填答份数：{{ progressData.submissionCount }} / 有效批次 {{ progressData.validCount }}
          <span v-if="progressData.expectedSample">（预期 {{ progressData.expectedSample }} 份）</span>
        </p>
        <p v-if="progressData.completionRate != null">
          填答完成率：{{ progressData.completionRate }}%
        </p>
        <p v-if="progressData.receivedResponseCount != null">
          有效回收答卷：{{ progressData.receivedResponseCount }}
          <span v-if="progressData.expectedResponseCount">
            / {{ progressData.expectedResponseCount }}
          </span>
        </p>
        <p v-if="progressData.responseCollectionRate != null">
          样本回收率：{{ progressData.responseCollectionRate }}%（与间接达成度覆盖率口径一致）
        </p>
        <p v-if="(progressData.pendingConfirmCount ?? 0) > 0" class="ie__progress-pending-confirm">
          待确认有效
          {{ progressData.pendingConfirmCount }}
          份（AI/文档导入草稿，须逐份确认有效后再纳入换算统计）
        </p>
        <p
          v-if="
            (progressData.scoredResponseCount ?? 0) > 0
              || (progressData.pendingConversionCount ?? 0) > 0
              || (progressData.noSubstantiveCount ?? 0) > 0
          "
        >
          已换算 {{ progressData.scoredResponseCount ?? 0 }} · 待换算
          {{ progressData.pendingConversionCount ?? 0 }}
          <span v-if="(progressData.pendingConversionCount ?? 0) > 0">（选择/开放题须教师录入换算分）</span>
          <span v-if="(progressData.noSubstantiveCount ?? 0) > 0">
            · 无实质作答 {{ progressData.noSubstantiveCount }}
          </span>
        </p>
      </template>
    </UiSpin>
  </UiDrawer>

  <UiDrawer v-model:open="statisticsDrawerVisible" title="问卷统计分析" width="720" hide-footer>
    <UiSpin :spinning="statisticsLoading">
      <template v-if="statisticsData">
        <div class="ie__stats-actions">
          <UiButton
            size="sm"
            variant="outline"
            :loading="exportContributing"
            @click="exportContribution"
          >
            导出认证明细
          </UiButton>
        </div>
        <UiAlertStrip
          v-if="weightedAttainmentNoticeVisible"
          tone="info"
          title="间接达成度计算口径已升级：多题项支撑同一目标时，按题项权重加权合成（原为样本简单均值），历史数值可能变化。"
          class="tw:mb-dp-4"
          @close="dismissWeightedAttainmentNotice"
        >
          <template #actions>
            <UiButton size="sm" variant="ghost" @click="openWeightedAttainmentHelp">
              了解详情
            </UiButton>
          </template>
        </UiAlertStrip>
        <p>
          有效回收答卷：{{ statisticsData.overallSampleCount }}
          <span v-if="(statisticsData.overallScoredCount ?? 0) > 0">
            · 已换算 {{ statisticsData.overallScoredCount }}
          </span>
          <span v-if="(statisticsData.pendingConfirmCount ?? 0) > 0">
            · 待确认 {{ statisticsData.pendingConfirmCount }}
          </span>
          <span v-if="(statisticsData.pendingConversionCount ?? 0) > 0">
            · 待换算 {{ statisticsData.pendingConversionCount }}
          </span>
          <span v-if="(statisticsData.noSubstantiveCount ?? 0) > 0">
            · 无实质作答 {{ statisticsData.noSubstantiveCount }}
          </span>
          <span v-if="statisticsData.overallScore != null">
            · 总体换算分 {{ statisticsData.overallScore }}（题项权重加权，与达成度一致）
          </span>
          <span
            v-else-if="
              showTargetScoreCards(statisticsData.targetScores)
                && statisticsData.targetScores!.length > 1
            "
            class="ie__stats-multi-target-hint"
          >
            · 本问卷含多个评价目标，请查看下方分目标加权分
          </span>
        </p>
        <div v-if="showTargetScoreCards(statisticsData.targetScores)" class="ie__target-scores">
          <div
            v-for="target in statisticsData.targetScores"
            :key="`${target.targetType}-${target.targetId}`"
            class="ie__target-score-card"
          >
            <div class="ie__target-score-head">
              <span class="ie__target-score-label">{{ target.targetLabel }}</span>
              <span v-if="target.itemCount != null" class="ie__target-score-meta">
                {{ target.itemCount }} 题
              </span>
            </div>
            <UiAlertStrip
              v-if="target.success === false && target.errorMessage"
              tone="error"
              :title="target.errorMessage"
              class="ie__target-score-error"
            />
            <template v-else-if="target.success !== false">
              <p v-if="target.overallScore != null" class="ie__target-score-value">
                加权间接分 {{ target.overallScore }}
                <span v-if="target.equalWeightFallback">（等权重 1:1）</span>
              </p>
              <p v-else class="ie__target-score-muted">暂无可计入样本</p>
              <p v-if="target.pendingBlocked" class="ie__target-score-warn">
                存在待换算答卷，达成度统计可能不完整
              </p>
              <p
                v-if="
                  target.directValue != null
                    || target.indirectAchievementValue != null
                    || target.compositeValue != null
                "
                class="ie__target-score-synthesis"
              >
                <span v-if="target.directValue != null">D {{ target.directValue }}</span>
                <span v-if="target.indirectAchievementValue != null">
                  · I {{ target.indirectAchievementValue }}</span>
                <span
                  v-if="formatDirectIndirectWeights(target.directWeight, target.indirectWeight)"
                >
                  · w {{ formatDirectIndirectWeights(target.directWeight, target.indirectWeight) }}
                </span>
                <span v-if="target.compositeValue != null"> · C {{ target.compositeValue }}</span>
                <span v-if="target.achievementStaleFlag" class="ie__target-score-stale">（已过期）</span>
              </p>
              <UiButton
                v-if="target.achievementResultId"
                variant="ghost"
                size="sm"
                class="ie__target-score-link"
                @click="openAchievementDetail(target)"
              >
                查看达成度详情
              </UiButton>
            </template>
          </div>
        </div>
        <UiDataTable
          pagination-mode="server"
          :columns="[
            { title: '题项', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
            { title: '题干', dataIndex: 'itemText', key: 'itemText' },
            { title: '有效样本', dataIndex: 'validCount', key: 'validCount', width: 88 },
            { title: '已换算', dataIndex: 'scoredCount', key: 'scoredCount', width: 72 },
            {
              title: '待确认',
              dataIndex: 'pendingConfirmCount',
              key: 'pendingConfirmCount',
              width: 72,
            },
            {
              title: '待换算',
              dataIndex: 'pendingConversionCount',
              key: 'pendingConversionCount',
              width: 72,
            },
            {
              title: '无实质',
              dataIndex: 'noSubstantiveCount',
              key: 'noSubstantiveCount',
              width: 72,
            },
            { title: '均值', dataIndex: 'mean', key: 'mean', width: 80 },
            { title: '换算分 μ', dataIndex: 'convertedScore', key: 'convertedScore', width: 90 },
            { title: '权重 w', dataIndex: 'weight', key: 'weight', width: 96 },
            {
              title: '贡献 μ×w',
              dataIndex: 'weightedContribution',
              key: 'weightedContribution',
              width: 88,
            },
          ]"
          :data-source="statisticsItems"
          row-key="itemId"
          :loading="statisticsLoading"
          flat
          :total="statisticsItemTotal"
          :page-num="statisticsItemPageNum"
          :page-size="statisticsItemPageSize"
          @page-change="handleStatisticsItemPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'weight'">
              {{ formatIndirectItemWeightDisplay(record.weight, record.equalWeightFallback) }}
            </template>
          </template>
        </UiDataTable>
      </template>
    </UiSpin>
  </UiDrawer>
</template>

<style scoped lang="scss">
.ie {
  &__workflow-card {
    margin-bottom: var(--dp-space-component);
  }

  &__workflow-line {
    margin: 0;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-sm);
  }

  &__workflow-pending-confirm {
    color: var(--dp-warning);
    font-weight: 500;
  }

  &__progress-pending-confirm {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-warning);
    font-size: var(--dp-font-size-sm);
  }

  &__workflow-pending {
    color: var(--dp-warning);
    font-weight: 500;
  }

  &__workflow-no-substantive {
    color: var(--dp-text-muted);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__stats-multi-target-hint {
    color: var(--dp-text-muted);
  }

  &__stats-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--dp-space-component);
  }

  &__target-scores {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component);
  }

  &__target-score-card {
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    background: var(--dp-surface-subtle);
  }

  &__target-score-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-xs);
  }

  &__target-score-label {
    font-weight: 500;
    font-size: var(--dp-font-size-sm);
  }

  &__target-score-meta {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__target-score-value {
    margin: 0;
    font-size: var(--dp-font-size-sm);
  }

  &__target-score-muted {
    margin: 0;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-sm);
  }

  &__target-score-warn {
    margin: var(--dp-space-component-xs) 0 0;
    color: var(--dp-warning);
    font-size: var(--dp-font-size-xs);
  }

  &__target-score-error {
    margin-top: var(--dp-space-component-xs);
  }

  &__target-score-synthesis {
    margin: var(--dp-space-component-xs) 0 0;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__target-score-stale {
    color: var(--dp-warning);
  }
}
</style>
