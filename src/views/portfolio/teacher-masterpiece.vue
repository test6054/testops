<script setup lang="ts">
import type { PortfolioProcessSessionVO } from '@/apis/portfolio/process-session'
import type { PortfolioMasterpieceContributionVO } from '@/apis/portfolio/types'
/**
 * 教学代表作只读预览：文档式阅读——身份/陈述为主叙事，过程与成果为证据，覆盖度/贡献度为旁注。
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
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
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
const bundleGeneration = ref(0)
const profileName = ref('')
const departmentName = ref('')
const titleName = ref('')
const completeness = ref<number | null>(null)
const officialCount = ref<number | null>(null)
const philosophyText = ref('')
const honorCount = ref<number | null>(null)
const summaryLoadFailed = ref(false)
const portraitLoadFailed = ref(false)
const philosophyLoadFailed = ref(false)
const honorLoadFailed = ref(false)
const processLoadFailed = ref(false)
const contributionLoadFailed = ref(false)
const profileLoadFailed = ref(false)
const processSessions = ref<PortfolioProcessSessionVO[]>([])
const masterpieceContribution = ref<PortfolioMasterpieceContributionVO | null>(null)

const isSelf = computed(() =>
  Boolean(targetTeacherId.value && targetTeacherId.value === currentUserId.value),
)

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const displayPhilosophy = computed(() => {
  const text = philosophyText.value
  if (!text) {
    return ''
  }
  return text.length > 600 ? `${text.slice(0, 600)}…` : text
})

function optionalMetric(value: number | null | undefined): string {
  return value == null ? '—' : String(value)
}

function clipText(text: string | undefined, max: number): string {
  const value = (text || '').trim()
  if (!value) {
    return ''
  }
  return value.length > max ? `${value.slice(0, max)}…` : value
}

async function loadAll() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    return
  }
  const teacherId = targetTeacherId.value
  const generation = ++bundleGeneration.value
  loading.value = true
  summaryLoadFailed.value = false
  portraitLoadFailed.value = false
  philosophyLoadFailed.value = false
  honorLoadFailed.value = false
  processLoadFailed.value = false
  contributionLoadFailed.value = false
  profileLoadFailed.value = false
  try {
    const summaryResult = await portfolioAnalysisApi
      .getWorkbenchSummary(teacherRequest.value)
      .then((row) => ({ ok: true as const, row }))
      .catch((error: unknown) => ({ ok: false as const, error }))
    if (generation !== bundleGeneration.value || targetTeacherId.value !== teacherId) {
      return
    }
    if (summaryResult.ok) {
      completeness.value = summaryResult.row?.completenessPercent ?? null
    } else {
      summaryLoadFailed.value = true
      completeness.value = null
      showUserError(summaryResult.error, '加载代表作工作台摘要失败')
    }

    const [
      portraitResult,
      philosophyResult,
      honorResult,
      detailResult,
      sessionResult,
      contributionResult,
    ] = await Promise.all([
      portfolioAnalysisApi
        .getPortrait(teacherRequest.value)
        .then((row) => ({ ok: true as const, row }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      portfolioTeachingPhilosophyApi
        .list(teacherRequest.value)
        .then((rows) => ({ ok: true as const, rows }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      portfolioTeacherHonorApi
        .list(teacherRequest.value)
        .then((rows) => ({ ok: true as const, rows }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      teacherId
        ? portfolioTeacherApi
          .get(teacherId)
          .then((row) => ({ ok: true as const, row }))
          .catch((error: unknown) => ({ ok: false as const, error }))
        : Promise.resolve({ ok: true as const, row: null }),
      portfolioProcessSessionApi
        .list({ ...teacherRequest.value, selectedOnly: true })
        .then((rows) => ({ ok: true as const, rows }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      portfolioAnalysisApi
        .getMasterpieceContribution(teacherRequest.value)
        .then((row) => ({ ok: true as const, row }))
        .catch((error: unknown) => ({ ok: false as const, error })),
    ])
    if (generation !== bundleGeneration.value || targetTeacherId.value !== teacherId) {
      return
    }

    if (portraitResult.ok) {
      officialCount.value = portraitResult.row?.officialRecordCount ?? null
    } else {
      portraitLoadFailed.value = true
      officialCount.value = null
      showUserError(portraitResult.error, '加载代表作画像失败')
    }

    if (philosophyResult.ok) {
      const firstPhil = philosophyResult.rows?.[0]
      philosophyText.value = firstPhil?.philosophyText?.trim() || ''
    } else {
      philosophyLoadFailed.value = true
      philosophyText.value = ''
      showUserError(philosophyResult.error, '加载教学理念失败')
    }

    if (honorResult.ok) {
      honorCount.value = honorResult.rows?.length ?? 0
    } else {
      honorLoadFailed.value = true
      honorCount.value = null
      showUserError(honorResult.error, '加载荣誉记录失败')
    }

    if (detailResult.ok && detailResult.row) {
      profileName.value = detailResult.row.nickName || detailResult.row.userName || ''
      departmentName.value = detailResult.row.departmentName || ''
      titleName.value = detailResult.row.title || ''
    } else if (!detailResult.ok) {
      profileLoadFailed.value = true
      showUserError(detailResult.error, '加载教师资料失败')
    }

    if (sessionResult.ok) {
      processSessions.value = sessionResult.rows ?? []
    } else {
      processLoadFailed.value = true
      showUserError(sessionResult.error, '加载过程记录失败')
    }

    if (contributionResult.ok) {
      masterpieceContribution.value = contributionResult.row
      contributionLoadFailed.value = false
    } else {
      contributionLoadFailed.value = true
      masterpieceContribution.value = null
      showUserError(contributionResult.error, '加载代表作贡献度失败')
    }
  } finally {
    if (generation === bundleGeneration.value) {
      loading.value = false
    }
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
      <article class="masterpiece">
        <header class="masterpiece__hero">
          <div class="masterpiece__scope">
            <UiTag v-if="isSelf" tone="blue" size="sm">本人</UiTag>
            <UiTag v-else tone="orange" size="sm">代看</UiTag>
          </div>
          <UiAlertStrip
            v-if="profileLoadFailed"
            tone="error"
            title="教师资料加载失败"
            class="dp-mb-tight"
          />
          <h1 class="masterpiece__name">{{ profileName || '—' }}</h1>
          <p class="masterpiece__identity">
            <template v-if="departmentName">{{ departmentName }}</template>
            <template v-if="titleName">
              <span v-if="departmentName"> · </span>{{ titleName }}
            </template>
            <template v-if="!departmentName && !titleName">院系与职称待完善</template>
          </p>
          <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/profile')">
            维护资料
          </UiButton>
        </header>

        <div class="masterpiece__layout">
          <div class="masterpiece__main">
            <section class="masterpiece__block" aria-labelledby="masterpiece-philosophy">
              <h2 id="masterpiece-philosophy" class="masterpiece__heading">教学陈述</h2>
              <UiAlertStrip
                v-if="philosophyLoadFailed"
                tone="error"
                title="教学理念加载失败"
                class="dp-mb-tight"
              />
              <p v-else-if="displayPhilosophy" class="masterpiece__prose">
                {{ displayPhilosophy }}
              </p>
              <UiEmpty v-else description="尚未撰写教学理念" size="sm" />
              <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/philosophy')">
                修订理念
              </UiButton>
            </section>

            <section class="masterpiece__block" aria-labelledby="masterpiece-process">
              <h2 id="masterpiece-process" class="masterpiece__heading">精选过程证据</h2>
              <UiAlertStrip
                v-if="processLoadFailed"
                tone="error"
                title="过程记录加载失败"
                class="dp-mb-tight"
              />
              <UiEmpty
                v-else-if="!processSessions.length"
                size="sm"
                description="尚未精选过程记录；请在过程记录中勾选「精选进代表作」"
              />
              <ul v-else class="masterpiece__evidence-list">
                <li
                  v-for="item in processSessions"
                  :key="item.id"
                  class="masterpiece__evidence-item"
                >
                  <strong>{{ item.sessionTitle }}</strong>
                  <span class="masterpiece__meta">
                    {{ item.sessionDate }} · {{ item.courseName || item.courseCode || '课程' }}
                  </span>
                  <p v-if="clipText(item.prepText, 200)" class="masterpiece__evidence-text">
                    准备：{{ clipText(item.prepText, 200) }}
                  </p>
                  <p v-if="clipText(item.processText, 200)" class="masterpiece__evidence-text">
                    过程：{{ clipText(item.processText, 200) }}
                  </p>
                  <p v-if="clipText(item.feedbackText, 200)" class="masterpiece__evidence-text">
                    反馈：{{ clipText(item.feedbackText, 200) }}
                  </p>
                </li>
              </ul>
              <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/process-journal')">
                打开过程记录
              </UiButton>
            </section>

            <section class="masterpiece__block" aria-labelledby="masterpiece-outcomes">
              <h2 id="masterpiece-outcomes" class="masterpiece__heading">发展与成果</h2>
              <UiAlertStrip
                v-if="honorLoadFailed"
                tone="error"
                title="荣誉记录加载失败"
                class="dp-mb-tight"
              />
              <p class="masterpiece__body">
                获奖记录 <strong>{{ honorCount == null ? '—' : honorCount }}</strong> 条
              </p>
              <div class="masterpiece__actions">
                <UiButton size="sm" variant="ghost" @click="go('/portfolio/teacher/honor')">
                  维护获奖
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  @click="go('/portfolio/teacher/extension-activity')"
                >
                  教学拓展
                </UiButton>
              </div>
            </section>
          </div>

          <aside class="masterpiece__aside" aria-label="覆盖度与贡献度旁注">
            <section class="masterpiece__note">
              <h2 class="masterpiece__note-title">材料覆盖</h2>
              <UiAlertStrip
                v-if="summaryLoadFailed || portraitLoadFailed"
                tone="warning"
                title="教学数据部分加载失败"
                :description="[
                  summaryLoadFailed ? '工作台摘要不可用' : '',
                  portraitLoadFailed ? '画像不可用' : '',
                ].filter(Boolean).join('；')"
                class="dp-mb-tight"
              />
              <p class="masterpiece__note-metric">
                {{ completeness == null ? '—' : `${completeness}%` }}
              </p>
              <p class="masterpiece__hint">
                正式档案 {{ officialCount == null ? '—' : `${officialCount} 条` }}
              </p>
              <p class="masterpiece__hint">覆盖度反映填报进度，不等于代表作质量。</p>
            </section>

            <section class="masterpiece__note">
              <h2 class="masterpiece__note-title">贡献度</h2>
              <UiAlertStrip
                v-if="contributionLoadFailed"
                tone="error"
                title="贡献度加载失败"
                class="dp-mb-tight"
              />
              <template v-else-if="masterpieceContribution">
                <p class="masterpiece__note-metric">
                  {{ optionalMetric(masterpieceContribution.contributionScore) }}
                </p>
                <p class="masterpiece__hint">
                  精选 {{ optionalMetric(masterpieceContribution.masterpieceCount) }} 项 · 最高单项
                  {{ optionalMetric(masterpieceContribution.topItemScore) }}
                </p>
                <details class="masterpiece__audit">
                  <summary>口径与审计说明</summary>
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
                </details>
              </template>
              <UiEmpty v-else description="暂无代表作贡献度" size="sm" />
            </section>
          </aside>
        </div>
      </article>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.masterpiece {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.masterpiece__hero {
  padding-bottom: var(--dp-space-component);
  border-bottom: 1px solid var(--dp-border-subtle);
}

.masterpiece__scope {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-tight);
}

.masterpiece__name {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xl);
  font-weight: 600;
  color: var(--dp-text-primary);
  line-height: 1.3;
}

.masterpiece__identity {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
}

.masterpiece__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 280px);
  gap: var(--dp-space-block);
  align-items: start;
}

.masterpiece__main {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
  min-width: 0;
}

.masterpiece__block {
  min-width: 0;
}

.masterpiece__heading {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.masterpiece__prose {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-primary);
  line-height: 1.65;
  white-space: pre-wrap;
}

.masterpiece__body {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-primary);
  line-height: 1.5;
}

.masterpiece__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.masterpiece__aside {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  min-width: 0;
}

.masterpiece__note {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
}

.masterpiece__note-title {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.masterpiece__note-metric {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xl);
  font-weight: 600;
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.masterpiece__hint {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.masterpiece__audit {
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.masterpiece__audit summary {
  cursor: pointer;
  color: var(--dp-text-secondary);
}

.masterpiece__evidence-list {
  margin: 0 0 var(--dp-space-component);
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--dp-space-component);
}

.masterpiece__evidence-item {
  padding: var(--dp-space-component-tight) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}

.masterpiece__meta {
  display: block;
  margin-top: 2px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.masterpiece__evidence-text {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-primary);
  line-height: 1.5;
  white-space: pre-wrap;
}

@media (max-width: 1023px) {
  .masterpiece__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .masterpiece__aside {
    order: -1;
  }
}
</style>
