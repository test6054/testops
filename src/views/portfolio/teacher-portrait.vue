<script setup lang="ts">
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { PortfolioTeacherPortraitVO } from '@/apis/portfolio/types'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'

const route = useRoute()
const { currentUserId, canPickTeachers, resolveDefaultTeacherId } = usePortfolioTeacherAccess()

const loading = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const portraitAbsent = ref(false)

const targetTeacherId = computed(() => {
  const queryId = typeof route.query.teacherId === 'string' ? route.query.teacherId : ''
  if (queryId) {
    return queryId
  }
  return resolveDefaultTeacherId() || currentUserId.value
})

const dimensionItems = computed((): UiStatPanelItem[] => {
  if (!portrait.value) {
    return []
  }
  const row = portrait.value
  return [
    { key: 'core', label: '职业发展核心', value: String(row.developmentCoreScore), unit: '分', tone: 'blue' },
    { key: 'teaching', label: '教学能力', value: String(row.teachingScore), unit: '分' },
    { key: 'research', label: '科研教研', value: String(row.researchScore), unit: '分' },
    { key: 'training', label: '培训发展', value: String(row.trainingScore), unit: '分' },
    { key: 'practice', label: '企业实践', value: String(row.practiceScore), unit: '分' },
  ]
})

async function loadPortrait() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    portraitAbsent.value = true
    return
  }
  loading.value = true
  portraitAbsent.value = false
  portrait.value = null
  try {
    const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
    portrait.value = await portfolioAnalysisApi.getPortrait(request)
  }
  catch (error) {
    if (readBusinessResultCode(error) === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    }
    else {
      showUserError(error, '加载教师画像失败')
    }
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPortrait()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      title="教师画像"
      description="一核心四能力（§8.37）；群体对比与指标明细见需求 §24.5"
    >
      <template #actions>
        <UiButton :loading="loading" @click="loadPortrait">
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <div v-if="canPickTeachers && !targetTeacherId" class="teacher-portrait__hint">
      <UiEmpty description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数" />
    </div>

    <template v-else>
      <a-spin :spinning="loading">
        <UiCard v-if="portrait" title="综合画像">
          <UiStatPanel
            :items="dimensionItems"
            :columns="5"
            variant="grid"
            compact
          />
          <p class="teacher-portrait__meta">
            正式档案记录 {{ portrait.officialRecordCount }} 条
            <template v-if="portrait.computedAt">
              · 最近重算 {{ portrait.computedAt }}
            </template>
          </p>
        </UiCard>

        <UiEmpty
          v-else-if="portraitAbsent && !loading"
          description="画像快照生成失败，请稍后刷新"
        />
      </a-spin>

      <UiCard v-if="portrait" title="待补充能力" class="teacher-portrait__pending">
        <UiEmpty description="指标明细下钻、同群体对比与历史趋势 API 尚未实现（§17.3 / §24.5）" />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-portrait__meta {
  margin: var(--dp-space-4, 16px) 0 0;
  font-size: 14px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-portrait__pending {
  margin-top: var(--dp-space-4, 16px);
}

.teacher-portrait__hint {
  padding: var(--dp-space-6, 24px) 0;
}
</style>
