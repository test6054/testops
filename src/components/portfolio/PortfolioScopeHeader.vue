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
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

const workShellOptions = computed(() =>
  (accessScope.value?.availableWorkShells ?? []).map((workShell) => ({
    label: WORK_SHELL_LABELS[workShell],
    value: workShell,
  })),
)

const activeWorkShell = computed(() => accessScope.value?.defaultWorkShell)

const selectedTeacherId = computed({
  get: () => portfolioStore.currentTeacherId || resolveDefaultTeacherId(),
  set: (value: string) => {
    const teacherId = value || ''
    if (teacherId) {
      portfolioStore.setTeacher(teacherId)
    }
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

/** 管理员/可选人是否正在代办他人档案 */
const isProxyingOtherTeacher = computed(() => {
  if (!canPickTeachers.value || !selectedTeacherId.value) {
    return false
  }
  return selectedTeacherId.value !== currentUserId.value
})

const proxyTeacherLabel = computed(() => {
  if (!selectedTeacherId.value) {
    return ''
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

const canFollowTeacherQuery = computed(() => canPickTeachers.value || canReviewPortfolio.value)

async function loadTeacherOptions(keyword?: string) {
  if (!canPickTeachers.value) {
    return
  }
  const currentToken = ++teacherListRequestToken.value
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
    mergeTeacherOptions(page.list ?? [])
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
    return
  }
  const currentToken = ++teacherDetailRequestToken.value
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
  } catch {
    // 已选教师标签补水失败时不阻断页面范围切换。
  }
}

function handleTeacherSearch(value: string) {
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
          <span class="portfolio-scope-header__name">{{ proxyTeacherLabel }}</span>
          <UiButton
            v-if="isProxyingOtherTeacher && currentUserId"
            size="sm"
            variant="outline"
            @click="backToSelf"
          >
            回本人
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="goTeacherDirectory">
            回名册
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="clearTeacherSelection">
            清除
          </UiButton>
        </template>
      </template>
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
  gap: var(--dp-space-3) var(--dp-space-4);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow:
    var(--dp-shadow-xs),
    inset 3px 0 0 color-mix(in srgb, var(--dp-blue-500) 55%, transparent);
}

.portfolio-scope-header__field {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--dp-space-3);
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

@media (max-width: 767px) {
  .portfolio-scope-header__field {
    width: 100%;
  }

  .portfolio-scope-header__select {
    min-width: 0;
    width: 100%;
  }
}
</style>
