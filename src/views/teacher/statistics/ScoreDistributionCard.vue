<template>
  <UiCard class="stats-card" compact>
    <template #title>成绩分数分布</template>
    <template #extra>
      <a-space>
        <a-select
          :value="props.classId"
          placeholder="全场考生"
          allow-clear
          class="stats-card__select stats-card__select--class"
          :options="props.classOptions"
          :loading="props.rosterLoading"
          @change="handleClassChange"
        />
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </a-space>
    </template>

    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="分数分布加载失败"
      compact
      @retry="reload"
    />
    <UiEmpty
      v-else-if="!distribution"
      description="暂无已确认完整的考试成绩，完成阅卷确认后可查看分数分布"
    />
    <div v-else class="score-dist">
      <a-row :gutter="12" class="score-dist__metrics">
        <a-col :span="6">
          <a-statistic title="统计人数" :value="distribution.participantCount" suffix="人" />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="及格人数"
            :value="distribution.passCount"
            suffix="人"
            :value-style="{ color: toneToColor('green') }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="平均分"
            :value="distribution.avgScore"
            :precision="1"
            :suffix="`/ ${distribution.fullScore}`"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic title="标准差" :value="distribution.stdDev" :precision="2" />
        </a-col>
      </a-row>

      <div v-if="histogramBarItems.length" class="score-dist__chart-wrap">
        <div class="score-dist__chart-meta">
          <strong>五级分数分布</strong>
          <span class="score-dist__chart-hint">
            按百分制换算分段（满分 {{ distribution.fullScore }}，及格线
            {{ distribution.passScore }}）
          </span>
        </div>
        <UiBarChart
          :items="histogramBarItems"
          orientation="vertical"
          class="score-dist__chart"
        />
      </div>
    </div>
  </UiCard>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamScoreDistributionVO } from '@/apis/mark/exam'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import { getExamScoreDistribution } from '@/apis/mark/exam'
import { UiBarChart, UiButton, UiCard, UiEmpty, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { showUserError, toUserError } from '@/utils/error-handler'
import { scoreHistogramToBarItems } from '@/utils/mark-statistics-chart'
import { toneToColor } from '@/utils/score-tone'

defineOptions({ name: 'ScoreDistributionCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  classId?: string
  classOptions: MarkClassOption[]
  rosterLoading: boolean
}>()

const emit = defineEmits<{ (e: 'class-change', classId?: string): void }>()

const distribution = ref<ExamScoreDistributionVO | null>(null)
const loading = ref(false)
const loadError = ref<Error | null>(null)

const histogramBarItems = computed(() => {
  if (!distribution.value) return []
  return scoreHistogramToBarItems({
    ranges: distribution.value.ranges,
    counts: distribution.value.counts,
  })
})

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    distribution.value = await getExamScoreDistribution({
      examId: props.examId,
      classId: props.classId || undefined,
    })
  } catch (e) {
    distribution.value = null
    loadError.value = toUserError(e, '分数分布加载失败')
    showUserError(e, '分数分布加载失败')
  } finally {
    loading.value = false
  }
}

function handleClassChange(value?: SelectValue): void {
  emit('class-change', typeof value === 'string' ? value : undefined)
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) {
      void reload()
    } else {
      distribution.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.score-dist__chart {
  width: 100%;
}
</style>
