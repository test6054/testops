<script setup lang="ts">
import type { PortfolioProcessSessionVO } from '@/apis/portfolio/process-session'
import type { PortfolioMasterpieceContributionVO } from '@/apis/portfolio/types'
/**
 * 教学代表作只读预览：聚合简历/数据/陈述/过程入口/发展/成果，供本人与院审阅读。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { portfolioProcessSessionApi } from '@/apis/portfolio/process-session'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { portfolioTeacherHonorApi } from '@/apis/portfolio/teacher-honor'
import { portfolioTeachingPhilosophyApi } from '@/apis/portfolio/teaching-philosophy'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

defineOptions({ name: 'PortfolioTeacherMasterpiece' })

const router = useRouter()
const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()

const loading = ref(false)
const profileName = ref('')
const departmentName = ref('')
const titleName = ref('')
const completeness = ref<number | null>(null)
const officialCount = ref<number | null>(null)
const philosophyText = ref('')
const honorCount = ref(0)
const loadError = ref(false)
const processSessions = ref<PortfolioProcessSessionVO[]>([])
const masterpieceContribution = ref<PortfolioMasterpieceContributionVO | null>(null)

const isSelf = computed(() =>
  Boolean(targetTeacherId.value && targetTeacherId.value === currentUserId.value),
)

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

async function loadAll() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const teacherId = targetTeacherId.value
    const [summary, portrait, philosophyRows, honorRows, detail] = await Promise.all([
      portfolioAnalysisApi.getWorkbenchSummary(teacherRequest.value),
      portfolioAnalysisApi.getPortrait(teacherRequest.value).catch(() => null),
      portfolioTeachingPhilosophyApi.list(teacherRequest.value).catch(() => []),
      portfolioTeacherHonorApi.list(teacherRequest.value).catch(() => []),
      teacherId ? portfolioTeacherApi.get(teacherId).catch(() => null) : Promise.resolve(null),
    ])
    const selectedSessions = await portfolioProcessSessionApi
      .list({ ...teacherRequest.value, selectedOnly: true })
      .catch(() => [])
    processSessions.value = selectedSessions ?? []
    masterpieceContribution.value = await portfolioAnalysisApi
      .getMasterpieceContribution(teacherRequest.value)
      .catch(() => null)
    completeness.value = summary?.completenessPercent ?? null
    officialCount.value = portrait?.officialRecordCount ?? null
    const firstPhil = philosophyRows?.[0]
    philosophyText.value = firstPhil?.philosophyText?.trim() || ''
    honorCount.value = honorRows?.length ?? 0
    if (detail) {
      profileName.value = detail.nickName || detail.userName || ''
      departmentName.value = detail.departmentName || ''
      titleName.value = detail.title || ''
    }
  } catch (error) {
    loadError.value = true
    showUserError(error, '加载教学代表作失败')
  } finally {
    loading.value = false
  }
}

function withTeacherQuery() {
  return targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
}

function go(path: string) {
  void router.push({ path, query: withTeacherQuery() })
}

usePortfolioScopedLoader(loadAll, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教学代表作预览">
        <template #actions>
          <UiButton size="sm" @click="go('/portfolio/teacher/home')">回工作台</UiButton>
          <UiButton size="sm" variant="outline" @click="loadAll">刷新</UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <UiSpin v-else :spinning="loading">
      <div class="masterpiece">
        <div class="masterpiece__scope">
          <UiTag :tone="isSelf ? 'blue' : 'orange'" size="sm">
            {{ isSelf ? '本人' : '代办/评阅' }}
          </UiTag>
          <span class="masterpiece__name">{{ profileName || '当前教师' }}</span>
          <span v-if="departmentName" class="masterpiece__meta">{{ departmentName }}</span>
          <span v-if="titleName" class="masterpiece__meta">{{ titleName }}</span>
        </div>

        <UiCard title="① 教学简历" class="masterpiece__section">
          <p class="masterpiece__body">
            {{ profileName || '—' }}
            <template v-if="departmentName"> · {{ departmentName }}</template>
            <template v-if="titleName"> · {{ titleName }}</template>
          </p>
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/profile')">
            维护资料
          </UiButton>
        </UiCard>

        <UiCard title="② 教学数据" class="masterpiece__section">
          <p class="masterpiece__body">
            材料覆盖
            <strong>{{ completeness == null ? '—' : `${completeness}%` }}</strong>
            · 正式档案
            <strong>{{ officialCount == null ? '—' : `${officialCount} 条` }}</strong>
          </p>
          <p class="masterpiece__hint">覆盖度反映填报进度，不等于代表作质量。</p>
        </UiCard>

        <UiCard title="§8.54 代表作贡献度" class="masterpiece__section">
          <template v-if="masterpieceContribution">
            <p class="masterpiece__body">
              贡献度
              <strong>{{ masterpieceContribution.contributionScore ?? 0 }}</strong>
              · 精选
              <strong>{{ masterpieceContribution.masterpieceCount ?? 0 }}</strong>
              项 · 最高单项
              <strong>{{ masterpieceContribution.topItemScore ?? 0 }}</strong>
            </p>
            <p class="masterpiece__hint">{{ masterpieceContribution.formulaLabel }}</p>
            <PortfolioOwnerIdentityLayersCell
              :layers="masterpieceContribution.ownerIdentityLayers"
              :note="masterpieceContribution.ownerMultiIdentityNote"
              show-note
            />
            <p
              v-for="(note, idx) in masterpieceContribution.evidenceNotes || []"
              :key="`mp-note-${idx}`"
              class="masterpiece__hint"
            >
              {{ note }}
            </p>
          </template>
          <UiEmpty v-else description="暂无代表作贡献度" size="sm" />
        </UiCard>

        <UiCard title="③ 教学陈述" class="masterpiece__section">
          <p v-if="philosophyText" class="masterpiece__body masterpiece__body--pre">
            {{ philosophyText.length > 600 ? `${philosophyText.slice(0, 600)}…` : philosophyText }}
          </p>
          <UiEmpty v-else description="尚未撰写教学理念" size="sm" />
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/philosophy')">
            修订理念
          </UiButton>
        </UiCard>

        <UiCard title="④ 教学过程记录" class="masterpiece__section">
          <UiEmpty
            v-if="!processSessions.length"
            size="sm"
            description="尚未精选过程记录；请在过程记录中勾选「精选进代表作」"
          />
          <ul v-else class="masterpiece__process-list">
            <li v-for="item in processSessions" :key="item.id" class="masterpiece__process-item">
              <strong>{{ item.sessionTitle }}</strong>
              <span class="masterpiece__meta">
                {{ item.sessionDate }} · {{ item.courseName || item.courseCode || '课程' }}
              </span>
              <p v-if="item.prepText" class="masterpiece__body masterpiece__body--pre">
                准备：{{
                  item.prepText.length > 200 ? `${item.prepText.slice(0, 200)}…` : item.prepText
                }}
              </p>
              <p v-if="item.processText" class="masterpiece__body masterpiece__body--pre">
                过程：{{
                  item.processText.length > 200
                    ? `${item.processText.slice(0, 200)}…`
                    : item.processText
                }}
              </p>
              <p v-if="item.feedbackText" class="masterpiece__body masterpiece__body--pre">
                反馈：{{
                  item.feedbackText.length > 200
                    ? `${item.feedbackText.slice(0, 200)}…`
                    : item.feedbackText
                }}
              </p>
            </li>
          </ul>
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/process-journal')">
            打开过程记录
          </UiButton>
        </UiCard>

        <UiCard title="⑤ 发展与研究（可选）" class="masterpiece__section">
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/extension-activity')">
            教学拓展
          </UiButton>
        </UiCard>

        <UiCard title="⑥ 成果与奖励（可选）" class="masterpiece__section">
          <p class="masterpiece__body">
            获奖记录 <strong>{{ honorCount }}</strong> 条
          </p>
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/honor')">
            维护获奖
          </UiButton>
        </UiCard>

        <p v-if="loadError" class="masterpiece__error">部分章节加载失败，请刷新重试。</p>
      </div>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.masterpiece {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  max-width: 880px;
}

.masterpiece__scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  min-height: 40px;
}

.masterpiece__name {
  font-weight: var(--dp-font-weight-emphasis);
}

.masterpiece__meta,
.masterpiece__hint {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.masterpiece__section {
  :deep(.ui-card__body) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--dp-space-2);
  }
}

.masterpiece__body {
  margin: 0;
  line-height: 1.6;
  color: var(--dp-text-primary);
}

.masterpiece__body--pre {
  white-space: pre-wrap;
}

.masterpiece__process-list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.masterpiece__process-item {
  width: 100%;
  padding: var(--dp-space-2) 0;
  border-top: 1px solid var(--dp-border);

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }
}

.masterpiece__error {
  margin: 0;
  color: var(--dp-error);
  font-size: var(--dp-font-size-sm);
}
</style>
