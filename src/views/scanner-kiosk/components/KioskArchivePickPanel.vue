<script setup lang="ts">
import type { ScannerKioskArchiveVolumeItemVO } from '@/apis/mark/scanner-kiosk'
import { createAdhocDispatchTicket, pageKioskArchiveVolumes } from '@/apis/mark/scanner-kiosk'
import { MapPin, RefreshCw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  scannerDeviceId: string
  scannerStationId: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const router = useRouter()
const loading = ref(false)
const pickingVolumeId = ref('')
const errorMessage = ref('')
const keyword = ref('')
const pageNum = ref(1)
const pageSize = 8
const total = ref(0)
const volumes = ref<ScannerKioskArchiveVolumeItemVO[]>([])

const canPick = computed(() => Boolean(props.scannerDeviceId) && Boolean(props.scannerStationId))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

watch(
  () => props.open,
  (open) => {
    if (open) {
      pageNum.value = 1
      keyword.value = ''
      void loadVolumes()
    }
  },
)

async function loadVolumes() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await pageKioskArchiveVolumes({
      pageNum: pageNum.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
    })
    volumes.value = page.list
    total.value = page.total
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    volumes.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function volumeContractIssue(row: ScannerKioskArchiveVolumeItemVO): string {
  if (row.volumeStatus !== ArchiveVolumeStatusCode.COLLECTING) {
    return '归档卷不在收集中状态'
  }
  if (!row.archiveTitle?.trim()) {
    return '归档卷名称缺失'
  }
  if (!row.courseName?.trim()) {
    return '课程名称缺失'
  }
  if (!row.examName?.trim()) {
    return '考试名称缺失'
  }
  if (!row.academicYear?.trim()) {
    return '学年缺失'
  }
  if (!row.physicalStorageLocation?.trim()) {
    return '档案柜位未登记'
  }
  return ''
}

async function changePage(nextPage: number) {
  pageNum.value = nextPage
  await loadVolumes()
}

async function searchVolumes() {
  pageNum.value = 1
  await loadVolumes()
}

async function pickVolume(row: ScannerKioskArchiveVolumeItemVO) {
  if (canPick.value !== true) {
    showFormValidationMessage('工位未激活，无法现场开单')
    return
  }
  const issue = volumeContractIssue(row)
  if (issue) {
    showFormValidationMessage(`${issue}，请先在电脑端修正`)
    return
  }
  pickingVolumeId.value = row.volumeId
  try {
    const response = await createAdhocDispatchTicket({
      taskKind: ScanTaskKindCode.EXAM_ARCHIVE,
      volumeId: row.volumeId,
      scannerDeviceId: props.scannerDeviceId,
      scannerStationId: props.scannerStationId,
    })
    const ticket = response.ticket
    if (!ticket?.ticketId) {
      showUserError(null, '现场开单失败')
      return
    }
    const ticketId = ticket.ticketId
    emit('update:open', false)
    void router.push(ticket.kioskDispatchUrl || `/scanner-kiosk/dispatch/${ticketId}`)
  } catch (error) {
    showUserError(error, '现场开单失败')
  } finally {
    pickingVolumeId.value = ''
  }
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="现场开单 · 考试归档"
    width="920"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <div class="archive-pick__toolbar">
      <UiSearchBox
        v-model="keyword"
        placeholder="搜索考试或归档卷名称"
        allow-clear
        class="archive-pick__search"
        @search="searchVolumes"
      />
      <UiButton variant="outline" size="lg" :loading="loading" @click="loadVolumes">
        <template #icon><RefreshCw :size="20" /></template>
        刷新
      </UiButton>
    </div>

    <p v-if="errorMessage" class="archive-pick__error">{{ errorMessage }}</p>
    <div v-else-if="!loading && volumes.length === 0" class="archive-pick__empty">
      当前没有可现场开单的收集中归档卷
    </div>

    <ul v-else class="archive-pick__list">
      <li v-for="volume in volumes" :key="volume.volumeId" class="archive-pick__item">
        <div class="archive-pick__main">
          <div class="archive-pick__head">
            <h3>{{ volume.archiveTitle || '归档卷名称缺失' }}</h3>
            <UiTag tone="green" size="sm">收集中</UiTag>
          </div>
          <div class="archive-pick__meta">
            <span>{{ volume.courseName || '课程名称缺失' }}</span>
            <span>{{ volume.examName || '考试名称缺失' }}</span>
            <span>
              {{ volume.academicYear || '学年缺失' }}
              <template v-if="volume.semester"> · 第{{ volume.semester }}学期</template>
            </span>
            <span>{{ volume.teachingClassName || '教学班信息缺失' }}</span>
            <span>{{ volume.departmentName || '院系信息缺失' }}</span>
            <span><MapPin :size="18" />{{ volume.physicalStorageLocation || '柜位未登记' }}</span>
          </div>
          <p v-if="volumeContractIssue(volume)" class="archive-pick__issue">
            数据不完整：{{ volumeContractIssue(volume) }}
          </p>
        </div>
        <UiButton
          variant="primary"
          size="lg"
          :loading="pickingVolumeId === volume.volumeId"
          :disabled="canPick !== true || Boolean(volumeContractIssue(volume))"
          @click="pickVolume(volume)"
        >
          开始扫描
        </UiButton>
      </li>
    </ul>

    <div v-if="total > pageSize" class="archive-pick__pager">
      <UiButton
        variant="outline"
        size="lg"
        :disabled="pageNum <= 1"
        @click="changePage(pageNum - 1)"
      >
        上一页
      </UiButton>
      <span>第 {{ pageNum }} / {{ totalPages }} 页</span>
      <UiButton
        variant="outline"
        size="lg"
        :disabled="pageNum >= totalPages"
        @click="changePage(pageNum + 1)"
      >
        下一页
      </UiButton>
    </div>
  </UiDrawer>
</template>

<style scoped>
.archive-pick__toolbar,
.archive-pick__head,
.archive-pick__meta,
.archive-pick__pager {
  display: flex;
  align-items: center;
}

.archive-pick__toolbar {
  gap: 12px;
  margin-bottom: 18px;
}

.archive-pick__search {
  flex: 1;
  min-width: 0;
}

.archive-pick__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.archive-pick__item {
  min-height: 136px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  align-items: center;
  gap: 20px;
  padding: 18px 20px;
  border: 1px solid var(--kiosk-divider);
  border-radius: 7px;
  background: var(--kiosk-surface);
}

.archive-pick__head {
  justify-content: space-between;
  gap: 12px;
}

.archive-pick__head h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0;
}

.archive-pick__meta {
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 12px;
  color: var(--kiosk-ink-secondary);
}

.archive-pick__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.archive-pick__issue,
.archive-pick__error {
  color: var(--kiosk-danger);
}

.archive-pick__issue {
  margin: 8px 0 0;
}

.archive-pick__empty {
  min-height: 300px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.archive-pick__pager {
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}
</style>
