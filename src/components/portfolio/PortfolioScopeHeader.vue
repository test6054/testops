<script lang="ts" setup>
/**
 * 教学档案袋域统一教师范围选择器：写入 portfolioStore 并同步 URL query。
 */
import type { SegmentedValue } from 'ant-design-vue/es/segmented/src/segmented'
import type { PortfolioTeacherSummaryVO, PortfolioWorkShellCode } from '@/apis/portfolio/types'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import {
  isPortfolioWorkShellCode,
  usePortfolioReviewAccess,
} from '@/composables/usePortfolioReviewAccess'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { useRouteStore } from '@/stores'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { showUserError } from '@/utils/error-handler'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'

defineOptions({ name: 'PortfolioScopeHeader' })

const route = useRoute()
const router = useRouter()
const portfolioStore = usePortfolioStore()
const routeStore = useRouteStore()
const { canPickTeachers, canReviewPortfolio, currentUserId, resolveDefaultTeacherId }
  = usePortfolioTeacherAccess()
const { accessScope, ensureLoaded, selectWorkShell } = usePortfolioReviewAccess()

const WORK_SHELL_LABELS: Record<PortfolioWorkShellCode, string> = {
  TEACHER: '维护我的档案',
  DEPARTMENT_REVIEW: '审核本院材料',
  SCHOOL_GOVERNANCE: '查看全校进度',
  CONFIGURATION: '系统配置',
  EXTERNAL_EXPERT: '外部专家评审',
}

const teacherOptions = ref<PortfolioTeacherSummaryVO[]>([])
const loading = ref(false)
const teacherListRequestToken = ref(0)
const teacherDetailRequestToken = ref(0)
const switchingWorkShell = ref(false)
const teacherNameLoadFailed = ref(false)
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

const workShellOptions = computed(() =>
  (accessScope.value?.availableWorkShells ?? []).map((workShell) => ({
    label: WORK_SHELL_LABELS[workShell],
    value: workShell,
  })),
)

const activeWorkShell = computed(() => accessScope.value?.defaultWorkShell)
const queryTeacherId = computed(() =>
  typeof route.query.teacherId === 'string' ? route.query.teacherId : '')
const canFollowTeacherQuery = computed(() => canPickTeachers.value || canReviewPortfolio.value)
const canUseQueryTeacher = computed(() =>
  Boolean(
    queryTeacherId.value
    && (canFollowTeacherQuery.value || queryTeacherId.value === currentUserId.value),
  ))

const selectedTeacherId = computed({
  get: () => canUseQueryTeacher.value
    ? queryTeacherId.value
    : portfolioStore.currentTeacherId || resolveDefaultTeacherId(),
  set: (value: string) => {
    const teacherId = value || ''
    // 清空时立即写 store，避免仅改 URL 时短暂保留旧教师
    portfolioStore.setTeacher(teacherId)
    syncRouteQuery(teacherId)
  },
})

const selfTeacherLabel = computed(() => {
  if (canPickTeachers.value) {
    return ''
  }
  if (selectedTeacherId.value && selectedTeacherId.value !== currentUserId.value) {
    const teacher = teacherOptions.value.find((item) => item.userId === selectedTeacherId.value)
    return `当前查看教师：${teacher?.nickName || teacher?.teacherNumber || selectedTeacherId.value}`
  }
  return '当前：本人'
})

/** 管理员代办或审核人深链代看他人档案 */
const isProxyingOtherTeacher = computed(() => {
  if (!selectedTeacherId.value || !currentUserId.value) {
    return false
  }
  if (selectedTeacherId.value === currentUserId.value) {
    return false
  }
  return canPickTeachers.value || canReviewPortfolio.value
})

const proxyTeacherLabel = computed(() => {
  if (!selectedTeacherId.value) {
    return ''
  }
  if (teacherNameLoadFailed.value) {
    return `已选择教师（名称加载失败）· ${selectedTeacherId.value}`
  }
  const teacher = teacherOptions.value.find((item) => item.userId === selectedTeacherId.value)
  return teacher?.nickName || teacher?.teacherNumber || selectedTeacherId.value
})

function goTeacherDirectory() {
  void router.push({ path: '/portfolio/teachers' })
}

function backToSelf() {
  if (!currentUserId.value) {
    selectedTeacherId.value = ''
    return
  }
  selectedTeacherId.value = currentUserId.value
}

function clearTeacherSelection() {
  selectedTeacherId.value = ''
}

async function loadTeacherOptions(keyword?: string) {
  if (!canPickTeachers.value || switchingWorkShell.value) {
    return
  }
  const currentToken = ++teacherListRequestToken.value
  const scopeTeacherId = selectedTeacherId.value
  loading.value = true
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    if (currentToken !== teacherListRequestToken.value) {
      return
    }
    // 搜索结果整页替换；保留当前已选教师，避免切壳/切人后旧名册混入
    const nextRows = page.list ?? []
    const selected = teacherOptions.value.find((item) => item.userId === scopeTeacherId)
    const optionMap = new Map(nextRows.map((item) => [item.userId, item]))
    if (selected && !optionMap.has(selected.userId)) {
      optionMap.set(selected.userId, selected)
    }
    teacherOptions.value = Array.from(optionMap.values())
  } catch (error) {
    if (currentToken !== teacherListRequestToken.value) {
      return
    }
    showUserError(error, '加载教师名册失败')
  } finally {
    if (currentToken === teacherListRequestToken.value) {
      loading.value = false
    }
  }
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teacherOptions.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teacherOptions.value = Array.from(optionMap.values())
}

async function hydrateTeacherOption(userId: string) {
  if (!userId || teacherOptions.value.some((item) => item.userId === userId)) {
    teacherNameLoadFailed.value = false
    return
  }
  const currentToken = ++teacherDetailRequestToken.value
  teacherNameLoadFailed.value = false
  try {
    const detail = await portfolioTeacherApi.get(userId)
    if (currentToken !== teacherDetailRequestToken.value) {
      return
    }
    mergeTeacherOptions([
      {
        userId: detail.userId,
        userName: detail.userName,
        nickName: detail.nickName,
        teacherNumber: detail.teacherNumber,
        departmentId: detail.departmentId,
        departmentName: detail.departmentName,
        title: detail.title,
        status: detail.status,
      },
    ])
    teacherNameLoadFailed.value = false
  } catch (error) {
    if (currentToken !== teacherDetailRequestToken.value) {
      return
    }
    teacherNameLoadFailed.value = true
    showUserError(error, '已选择教师，但名称加载失败')
  }
}

function handleTeacherSearch(value: string) {
  if (switchingWorkShell.value) {
    return
  }
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeacherOptions(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

/** 切换服务端授权的业务工作壳，并用新壳完整重建侧栏投影。 */
async function handleWorkShellChange(workShell: SegmentedValue) {
  if (!isPortfolioWorkShellCode(workShell)) {
    showUserError(new Error(`教学档案袋工作壳编码不受支持：${String(workShell)}`))
    return
  }
  const authorizedOption = workShellOptions.value.find((option) => option.value === workShell)
  if (!authorizedOption) {
    showUserError(new Error(`无权切换到教学档案袋工作壳：${workShell}`))
    return
  }
  if (workShell === activeWorkShell.value || switchingWorkShell.value) {
    return
  }
  switchingWorkShell.value = true
  teacherListRequestToken.value += 1
  teacherDetailRequestToken.value += 1
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
  try {
    const targetRoute = selectWorkShell(authorizedOption.value)
    await routeStore.generateMenus()
    await router.push(targetRoute)
  } catch (error) {
    showUserError(error, '切换教学档案袋工作台失败')
  } finally {
    switchingWorkShell.value = false
  }
}

function syncRouteQuery(teacherId: string) {
  if (switchingWorkShell.value) {
    return
  }
  const query = { ...route.query }
  if (teacherId) {
    query.teacherId = teacherId
  } else {
    delete query.teacherId
  }
  void router.replace({ path: route.path, query })
}

function bootstrapFromRoute() {
  const queryId = typeof route.query.teacherId === 'string' ? route.query.teacherId : ''
  if (queryId && canFollowTeacherQuery.value) {
    if (portfolioStore.currentTeacherId !== queryId) {
      portfolioStore.setTeacher(queryId)
    }
    return
  }
  if (!canPickTeachers.value && currentUserId.value) {
    if (portfolioStore.currentTeacherId !== currentUserId.value) {
      portfolioStore.setTeacher(currentUserId.value)
    }
    if (queryId && queryId !== currentUserId.value) {
      syncRouteQuery(currentUserId.value)
    }
  }
}

watch(
  () => route.query.teacherId,
  (teacherId) => {
    if (switchingWorkShell.value) {
      return
    }
    const id = typeof teacherId === 'string' ? teacherId : ''
    if (!canPickTeachers.value && accessScope.value === null) {
      return
    }
    if (!canFollowTeacherQuery.value) {
      const selfId = currentUserId.value
      if (selfId && id !== selfId) {
        if (portfolioStore.currentTeacherId !== selfId) {
          portfolioStore.setTeacher(selfId)
        }
        syncRouteQuery(selfId)
      }
      return
    }
    if (!id) {
      if (portfolioStore.currentTeacherId) {
        portfolioStore.setTeacher('')
      }
      return
    }
    if (id && id !== portfolioStore.currentTeacherId) {
      portfolioStore.setTeacher(id)
    }
  },
)

onMounted(async () => {
  await ensureLoaded()
  bootstrapFromRoute()
  void hydrateTeacherOption(portfolioStore.currentTeacherId || resolveDefaultTeacherId())
  void loadTeacherOptions()
})

onBeforeUnmount(() => {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
})

watch(
  () => selectedTeacherId.value,
  (teacherId) => {
    void hydrateTeacherOption(teacherId)
  },
)
</script>

<template>
  <div class="portfolio-scope-header">
    <div v-if="workShellOptions.length > 1" class="portfolio-scope-header__field">
      <span class="portfolio-scope-header__label">我在做</span>
      <div class="portfolio-scope-header__segmented-wrap">
        <UiSegmented
          :model-value="activeWorkShell"
          :options="workShellOptions"
          :disabled="switchingWorkShell"
          size="sm"
          @change="handleWorkShellChange"
        />
      </div>
    </div>
    <div class="portfolio-scope-header__field portfolio-scope-header__field--grow">
      <span class="portfolio-scope-header__label">当前教师</span>
      <template v-if="canPickTeachers">
        <template v-if="!selectedTeacherId">
          <UiTag tone="orange" size="sm">未选择</UiTag>
          <UiButton size="sm" variant="primary" @click="goTeacherDirectory">
            打开教师名册
          </UiButton>
          <UiSelect
            v-model="selectedTeacherId"
            class="portfolio-scope-header__select portfolio-scope-header__select--secondary"
            allow-search
            allow-clear
            size="sm"
            :loading="loading"
            :disabled="switchingWorkShell"
            placeholder="或快速搜索教师"
            :filter-option="false"
            :options="portfolioTeacherSelectOptionsFromSummaries(teacherOptions)"
            @search="handleTeacherSearch"
            @focus="() => loadTeacherOptions()"
          />
        </template>
        <template v-else>
          <UiTag v-if="isProxyingOtherTeacher" tone="orange" size="sm">代办</UiTag>
          <UiTag v-else tone="blue" size="sm">本人</UiTag>
          <UiTag v-if="teacherNameLoadFailed" tone="orange" size="sm">名称加载失败</UiTag>
          <span class="portfolio-scope-header__name">{{ proxyTeacherLabel }}</span>
          <UiButton
            v-if="isProxyingOtherTeacher && currentUserId"
            size="sm"
            variant="outline"
            :disabled="switchingWorkShell"
            @click="backToSelf"
          >
            回本人
          </UiButton>
          <UiButton size="sm" variant="ghost" :disabled="switchingWorkShell" @click="goTeacherDirectory">
            回名册
          </UiButton>
          <UiButton size="sm" variant="ghost" :disabled="switchingWorkShell" @click="clearTeacherSelection">
            清除
          </UiButton>
        </template>
      </template>
      <UiTag v-else-if="isProxyingOtherTeacher" tone="orange" size="sm">
        审核代看 · {{ proxyTeacherLabel }}
      </UiTag>
      <UiTag v-else tone="blue" size="sm">
        {{ selfTeacherLabel }}
      </UiTag>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.portfolio-scope-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component) var(--dp-space-block);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-card);
}

.portfolio-scope-header__field {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--dp-space-component);
}

.portfolio-scope-header__field--grow {
  flex: 1 1 280px;
}

.portfolio-scope-header__label {
  font-size: var(--dp-font-size-md);
  font-weight: var(--dp-font-weight-emphasis);
  color: var(--dp-text-secondary);
  white-space: nowrap;
}

.portfolio-scope-header__select {
  min-width: 260px;
  max-width: 360px;
}

.portfolio-scope-header__segmented-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.portfolio-scope-header__name {
  min-width: 0;
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-primary);
}

@media (max-width: 767px) {
  .portfolio-scope-header {
    flex-direction: column;
    align-items: stretch;
  }

  .portfolio-scope-header__field {
    width: 100%;
    flex-wrap: wrap;
    min-height: 44px;
  }

  .portfolio-scope-header__field--grow {
    flex: none;
  }

  .portfolio-scope-header__segmented-wrap {
    width: 100%;
  }

  .portfolio-scope-header__select {
    min-width: 0;
    width: 100%;
    min-height: 44px;
  }

  .portfolio-scope-header__select--secondary {
    order: 3;
    flex: 1 1 100%;
  }
}
</style>
