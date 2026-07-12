<script lang="ts" setup>
/**
 * 教学档案袋域统一教师范围选择器：写入 portfolioStore 并同步 URL query。
 */
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { showUserError } from '@/utils/error-handler'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'

defineOptions({ name: 'PortfolioScopeHeader' })

const emit = defineEmits<{
  change: []
}>()

const route = useRoute()
const router = useRouter()
const portfolioStore = usePortfolioStore()
const { canPickTeachers, currentUserId, resolveDefaultTeacherId } = usePortfolioTeacherAccess()

const teacherOptions = ref<PortfolioTeacherSummaryVO[]>([])
const loading = ref(false)
const teacherListRequestToken = ref(0)
const teacherDetailRequestToken = ref(0)
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

const selectedTeacherId = computed({
  get: () => portfolioStore.currentTeacherId || resolveDefaultTeacherId(),
  set: (value: string) => {
    portfolioStore.setTeacher(value)
    syncRouteQuery(value)
    emit('change')
  },
})

const selfTeacherLabel = computed(() => {
  if (canPickTeachers.value) {
    return ''
  }
  return '当前教师：本人'
})

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
  if (queryId) {
    portfolioStore.currentTeacherId = queryId
    return
  }
  if (!canPickTeachers.value && currentUserId.value) {
    portfolioStore.currentTeacherId = currentUserId.value
  }
}

watch(
  () => route.query.teacherId,
  (teacherId) => {
    const id = typeof teacherId === 'string' ? teacherId : ''
    if (id && id !== portfolioStore.currentTeacherId) {
      portfolioStore.currentTeacherId = id
      portfolioStore.bumpScopeChangeEpoch()
    }
  },
)

onMounted(() => {
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
    <span class="portfolio-scope-header__label">教师范围</span>
    <template v-if="canPickTeachers">
      <a-select
        v-model:value="selectedTeacherId"
        class="portfolio-scope-header__select"
        show-search
        allow-clear
        :loading="loading"
        placeholder="请选择目标教师"
        :filter-option="false"
        :options="portfolioTeacherSelectOptionsFromSummaries(teacherOptions)"
        @search="handleTeacherSearch"
        @focus="() => loadTeacherOptions()"
      />
    </template>
    <UiTag v-else tone="blue">
      {{ selfTeacherLabel }}
    </UiTag>
  </div>
</template>

<style lang="scss" scoped>
.portfolio-scope-header {
  display: flex;
  align-items: center;
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
</style>
