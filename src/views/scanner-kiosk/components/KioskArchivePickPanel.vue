<script setup lang="ts">
import type { ScannerKioskArchiveVolumeItemVO } from '@/apis/mark/scanner-kiosk'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_VOLUME_STATUS_TONE,
  ArchiveVolumeStatusDescription,
} from '@/apis/mark/archive-volume'
import { createAdhocDispatchTicket, pageKioskArchiveVolumes } from '@/apis/mark/scanner-kiosk'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  open: boolean
  scannerDeviceId: string
  scannerStationId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const loading = ref(false)
const pickingVolumeId = ref('')
const errorMessage = ref('')
const keyword = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const volumes = ref<ScannerKioskArchiveVolumeItemVO[]>([])

const canPick = computed(() => Boolean(props.scannerDeviceId) && Boolean(props.scannerStationId))

const columns = [
  {
    title: '柜位',
    key: 'physicalStorageLocation',
    dataIndex: 'physicalStorageLocation',
    width: 140,
  },
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 120 },
  { title: '卷名', key: 'archiveTitle', dataIndex: 'archiveTitle', ellipsis: true },
  { title: '教学班', key: 'teachingClassName', dataIndex: 'teachingClassName', width: 120 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 96 },
  { title: '操作', key: 'actions', width: 88 },
]

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
      pageSize: pageSize.value,
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

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadVolumes()
}

function volumeAcceptsKioskPick(status?: string): boolean {
  return (
    status === ArchiveVolumeStatusCode.COLLECTING
    || status === ArchiveVolumeStatusCode.STORED
    || status === ArchiveVolumeStatusCode.SUBMITTED
  )
}

async function pickVolume(row: ScannerKioskArchiveVolumeItemVO) {
  if (canPick.value !== true) {
    showFormValidationMessage('工位未激活，无法创建临时派单')
    return
  }
  if (!volumeAcceptsKioskPick(row.volumeStatus)) {
    showFormValidationMessage('当前卷状态不允许临时开单')
    return
  }
  if (!row.physicalStorageLocation?.trim()) {
    showFormValidationMessage('该卷尚未登记档案柜位，请先在电脑端补录柜位后再临时开单')
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
    const ticketId = response.ticket?.ticketId
    if (!ticketId) {
      showUserError(null, '临时派单创建失败')
      return
    }
    emit('update:open', false)
    const kioskPath
      = response.ticket?.kioskDispatchUrl || (ticketId ? `/scanner-kiosk/dispatch/${ticketId}` : '')
    if (kioskPath) {
      void router.push(kioskPath)
    }
  } catch (error) {
    showUserError(error, '创建临时派单失败')
  } finally {
    pickingVolumeId.value = ''
  }
}

function volumeStatusLabel(status: ScannerKioskArchiveVolumeItemVO['volumeStatus']) {
  return strictEnumLabel(ArchiveVolumeStatusDescription, status, 'volumeStatus')
}

function volumeStatusTone(status: ScannerKioskArchiveVolumeItemVO['volumeStatus']) {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, status, 'volumeStatus')
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="临时扫描 · 选择归档卷"
    width="880"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <p class="kiosk-archive-pick__hint">
      仅展示您已加入协作组、状态为收集中且已登记柜位的归档卷。若列表为空，请联系卷负责人将您添加为扫描协作成员后再试。
    </p>
    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <UiSearchBox
          v-model="keyword"
          placeholder="搜索卷名 / 编号 / 柜位"
          allow-clear
          class="kiosk-archive-pick__search"
          @search="
            () => {
              pageNum = 1
              loadVolumes()
            }
          "
        />
        <UiButton variant="outline" :disabled="loading === true" @click="loadVolumes">
          刷新
        </UiButton>
      </template>

      <p v-if="errorMessage" class="kiosk-archive-pick__error">{{ errorMessage }}</p>
      <UiDataTable
        pagination-mode="server"
        :columns="columns"
        :data-source="volumes"
        :loading="loading"
        :total="total"
        :current="pageNum"
        :page-size="pageSize"
        row-key="volumeId"
        size="middle"
        flat
        @page-change="handlePageChange"
        :sticky-header="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'physicalStorageLocation'">
            {{ record.physicalStorageLocation || '—' }}
          </template>
          <template v-else-if="column.key === 'volumeStatus'">
            <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
              {{ volumeStatusLabel(record.volumeStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                {
                  key: 'pick',
                  label: '开单',
                  disabled:
                    canPick !== true
                    || record.volumeStatus !== ArchiveVolumeStatusCode.COLLECTING
                    || pickingVolumeId === record.volumeId,
                },
              ]"
              split
              @action="() => pickVolume(record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </UiDrawer>
</template>

<style scoped>
.kiosk-archive-pick__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--kiosk-ink-secondary);
}
.kiosk-archive-pick__search {
  flex: 1;
  min-width: 0;
}
.kiosk-archive-pick__error {
  margin: 0 0 12px;
  padding: 0 var(--dp-space-5);
  color: var(--kiosk-danger);
}
</style>
