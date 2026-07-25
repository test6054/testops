<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAchievementStatsVO,
  PortfolioDevelopmentRecordVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：本院系成果综合口径（PF-P0-420） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系成果综合查询' : '成果综合查询'))


const recordTypeKeys: PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.HONOR,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]

function recordTypeLabel(type: PortfolioDevelopmentRecordTypeCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordTypeDescription, type, '发展档案条目类型')
}

const loading = ref(false)
/** 列表+统计共用请求 token，防止筛选连点串写 */
const pageRequestToken = ref(0)
const statsRequestToken = ref(0)
const rows = ref<PortfolioDevelopmentRecordVO[]>([])
const stats = ref<PortfolioAchievementStatsVO | null>(null)
const listLoadFailed = ref(false)
const statsLoadFailed = ref(false)
const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  searchText: '',
  levelCode: '',
  nationalOnly: false,
  recordTypes: recordTypeKeys,
})

const columns: ColumnsType = [
  { title: '类型', dataIndex: 'recordType', key: 'recordType', width: 88 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '级别', dataIndex: 'levelCode', key: 'levelCode', width: 88 },
  { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 180 },
  { title: '身份层', key: 'ownerIdentityLayers', width: 200 },
  { title: '业务日工号', dataIndex: 'affiliationStaffNo', key: 'affiliationStaffNo', width: 120 },
  { title: '业务日归属', dataIndex: 'affiliationSnapshot', key: 'affiliationSnapshot', width: 160 },
]

async function loadStats(levelCode?: PortfolioHonorLevelCode, nationalOnly?: boolean) {
  const currentToken = ++statsRequestToken.value
  try {
    const nextStats = await portfolioDevelopmentRecordApi.achievementStats({
      levelCode,
      nationalOnly,
    })
    if (currentToken !== statsRequestToken.value) {
      return
    }
    stats.value = nextStats
    statsLoadFailed.value = false
  } catch (error) {
    if (currentToken !== statsRequestToken.value) {
      return
    }
    statsLoadFailed.value = true
    showUserError(error, '加载成果统计失败')
  }
}

async function loadPage() {
  const currentToken = ++pageRequestToken.value
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    searchText: query.searchText || undefined,
    levelCode: (query.nationalOnly ? 'NATIONAL' : query.levelCode || undefined) as PortfolioHonorLevelCode | undefined,
    nationalOnly: query.nationalOnly || undefined,
    recordTypes: [...query.recordTypes],
  }
  loading.value = true
  listLoadFailed.value = false
  try {
    const page = await portfolioDevelopmentRecordApi.comprehensivePage(request)
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = page.list ?? []
    void loadStats(request.levelCode, request.nationalOnly)
  } catch (error) {
    if (currentToken !== pageRequestToken.value) {
      return
    }
    listLoadFailed.value = true
    showUserError(error, '加载成果综合查询失败')
  } finally {
    if (currentToken === pageRequestToken.value) {
      loading.value = false
    }
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="pageTitle" />
    </template>
    <UiAlertStrip
      v-if="listLoadFailed"
      tone="error"
      title="成果列表加载失败"
      class="mb-3"
    />
    <UiAlertStrip
      v-if="statsLoadFailed"
      tone="warning"
      title="成果统计加载失败"
      class="mb-3"
    />
    <UiCard v-if="stats" title="成果统计">
      <p>成果总数 {{ stats.totalCount }} · 国家级 {{ stats.nationalCount }}</p>
    </UiCard>
    <UiCard style="margin-top: var(--dp-space-block)">
      <div class="toolbar">
        <UiInput
          size="sm"
          v-model="query.searchText"
          placeholder="标题关键词"
          style="width: 180px"
          @press-enter="loadPage"
        />
        <UiInput
          size="sm"
          v-model="query.levelCode"
          placeholder="级别编码"
          style="width: 120px"
          :disabled="query.nationalOnly"
          @press-enter="loadPage"
        />
        <UiCheckbox v-model="query.nationalOnly"> 仅国家级 </UiCheckbox>
        <UiButton size="sm" variant="primary" @click="loadPage"> 查询 </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loading && rows.length === 0"
        :description="listLoadFailed ? '成果列表加载失败' : '当前筛选无综合成果'"
      />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordType'">
            {{ recordTypeLabel(record.recordType) }}
          </template>
          <template v-else-if="column.key === 'teacherUserId'">
            <div class="achievement-comprehensive__teacher">
              <span>{{
                formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber)
              }}</span>
              <UiTag
                v-if="record.lifecycleStatus"
                size="sm"
                :tone="
                  portfolioLifecycleTagTone(record.lifecycleStatus)
                "
              >
                {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
              </UiTag>
            </div>
          </template>
          <template v-else-if="column.key === 'ownerIdentityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id"
            />
          </template>
          <template v-else-if="column.key === 'affiliationStaffNo'">
            {{ record.affiliationStaffNo || '—' }}
          </template>
          <template v-else-if="column.key === 'affiliationSnapshot'">
            <span v-if="record.affiliationHistoryId">
              院系 {{ record.affiliationDepartmentId || '—' }}
              <template v-if="record.affiliationOpenSegment"> · 当前段</template>
              <template v-else> · 历史段</template>
            </span>
            <span v-else>—</span>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
  flex-wrap: wrap;
  align-items: center;
}
</style>
