<template>
  <UiDrawer
    :open="open"
    title="试评-正评一致性追踪"
    :width="760"
    hide-footer
    @update:open="emit('update:open', $event)"
  >
    <UiAlertStrip
      v-if="loadError"
      tone="error"
      :message="loadError"
      class="trial-formal-consistency-drawer__alert"
    />
    <UiAlertStrip
      v-else-if="report && report.trackable !== true"
      tone="warning"
      :message="report.blockedReason"
      class="trial-formal-consistency-drawer__alert"
    />
    <UiAlertStrip
      v-else-if="report && report.driftedSampleCount > 0"
      tone="warning"
      message="正评给分相对试评定标均分存在漂移样本，请组织教研复核评分尺度"
      class="trial-formal-consistency-drawer__alert"
    />

    <div v-if="report" class="trial-formal-consistency-drawer__kpi">
      <span>定标样本 {{ report.trialBaselineSampleCount }}</span>
      <span>可比样本 {{ report.matchedSampleCount }}</span>
      <span>漂移样本 {{ report.driftedSampleCount }}</span>
      <span>待定稿 {{ report.pendingFormalOnBaselineCount }}</span>
      <span>
        一致性
        {{ report.consistencyRate == null ? '—' : `${report.consistencyRate}%` }}
      </span>
      <span>
        最大分差
        {{ report.maxScoreDrift == null ? '—' : report.maxScoreDrift }}
      </span>
    </div>

    <div v-if="report && report.samples.length > 0" class="trial-formal-consistency-drawer__table-wrap">
      <table class="trial-formal-consistency-drawer__table">
        <thead>
          <tr>
            <th>样本</th>
            <th class="is-num">定标均分</th>
            <th>正评给分</th>
            <th class="is-num">最大分差</th>
            <th>判定</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sample in report.samples" :key="sample.sampleKey">
            <td>
              <UiTypographyText>
                {{ sample.questionNo ? `题 ${sample.questionNo}` : `答卷 ${sample.paperInstanceId}` }}
              </UiTypographyText>
              <span class="dp-text-muted-xs">满分 {{ sample.sampleFullScore }}</span>
            </td>
            <td class="is-num">{{ sample.trialBaselineMeanScore }}</td>
            <td>
              <span
                v-for="score in sample.formalScores"
                :key="score.taskId"
                class="trial-formal-consistency-drawer__score"
              >
                {{ score.reviewerName }} {{ score.formalScore }}
                <span class="dp-text-muted-xs">Δ{{ score.scoreDrift }}</span>
              </span>
            </td>
            <td class="is-num">{{ sample.maxScoreDrift }}</td>
            <td>
              <UiTag :tone="sample.drifted === true ? 'orange' : 'green'" size="sm">
                {{ sample.drifted === true ? '漂移' : '一致' }}
              </UiTag>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else-if="report && report.trackable === true && report.samples.length === 0"
      class="trial-formal-consistency-drawer__empty"
    >
      定标样本上尚无正评已定稿给分，待教师完成重叠样本正评后可追踪尺度漂移。
    </div>

    <section
      v-if="report && report.reviewerSummaries.length > 0"
      class="trial-formal-consistency-drawer__section"
    >
      <h4 class="trial-formal-consistency-drawer__title">教师汇总</h4>
      <table class="trial-formal-consistency-drawer__table">
        <thead>
          <tr>
            <th>教师</th>
            <th class="is-num">可比</th>
            <th class="is-num">漂移</th>
            <th class="is-num">平均分差</th>
            <th class="is-num">同教师对照</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.reviewerSummaries" :key="row.reviewerUserId">
            <td>{{ row.reviewerName || row.reviewerUserId }}</td>
            <td class="is-num">{{ row.matchedScoreCount }}</td>
            <td class="is-num">{{ row.driftedScoreCount }}</td>
            <td class="is-num">{{ row.averageAbsDrift == null ? '—' : row.averageAbsDrift }}</td>
            <td class="is-num">
              {{ row.sameReviewerPairCount }}
              <span v-if="row.sameReviewerAverageAbsDrift != null" class="dp-text-muted-xs">
                Δ{{ row.sameReviewerAverageAbsDrift }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type {
  FormalSessionResponse,
  TrialFormalConsistencyResponse,
} from '@/apis/mark/marking-organization'
import { ref, watch } from 'vue'
import { getTrialFormalConsistency } from '@/apis/mark/marking-organization'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { getUserErrorMessage } from '@/utils/error-handler'

defineOptions({ name: 'TrialFormalConsistencyDrawer' })

const props = defineProps<{
  open: boolean
  session: FormalSessionResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const report = ref<TrialFormalConsistencyResponse | null>(null)
const loadError = ref('')
const loading = ref(false)

watch(
  () => [props.open, props.session?.id] as const,
  async ([open, sessionId]) => {
    if (open !== true || !sessionId) {
      return
    }
    loading.value = true
    loadError.value = ''
    report.value = null
    try {
      report.value = await getTrialFormalConsistency(sessionId)
    }
    catch (error) {
      loadError.value = getUserErrorMessage(error, '加载试评-正评一致性报告失败')
    }
    finally {
      loading.value = false
    }
  },
)
</script>

<style lang="scss" scoped>
.trial-formal-consistency-drawer {
  &__alert {
    margin-bottom: var(--dp-space-component);
  }

  &__kpi {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-block);
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__table-wrap {
    overflow: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--dp-font-size-sm);

    th,
    td {
      padding: var(--dp-space-component-tight) var(--dp-space-component);
      border-bottom: 1px solid var(--dp-border-color);
      text-align: left;
      vertical-align: top;
    }

    .is-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }

  &__score {
    display: block;
    margin-bottom: 2px;
  }

  &__empty {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__section {
    margin-top: var(--dp-space-block);
  }

  &__title {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }
}
</style>
