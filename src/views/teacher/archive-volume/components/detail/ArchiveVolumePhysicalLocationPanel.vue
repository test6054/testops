<script setup lang="ts">
import type {
  ArchivePhysicalLocationResponse,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ArchiveSecurityLevelDescription,
  listArchivePhysicalLocationHistory,
  updateArchiveVolumePhysicalLocation,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  canEdit: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const submitting = ref(false)
const historyLoading = ref(false)
const locationHistory = ref<ArchivePhysicalLocationResponse[]>([])
const form = reactive({
  building: '',
  room: '',
  cabinet: '',
  slot: '',
  physicalLocationNote: '',
})

function applyStructuredLocation(source: {
  building?: string
  room?: string
  cabinet?: string
  slot?: string
  physicalLocationNote?: string
}) {
  form.building = source.building ?? ''
  form.room = source.room ?? ''
  form.cabinet = source.cabinet ?? ''
  form.slot = source.slot ?? ''
  form.physicalLocationNote = source.physicalLocationNote ?? ''
}

watch(
  () => props.detail.volume,
  (volume) => {
    applyStructuredLocation({
      building: volume.physicalBuilding,
      room: volume.physicalRoom,
      cabinet: volume.physicalCabinet,
      slot: volume.physicalSlot,
      physicalLocationNote: volume.physicalLocationNote,
    })
  },
  { immediate: true },
)

async function loadLocationHistory() {
  historyLoading.value = true
  try {
    locationHistory.value = await listArchivePhysicalLocationHistory({
      volumeId: props.volumeId,
      limit: 20,
    })
    if (!form.building && !form.cabinet && locationHistory.value.length > 0) {
      const latest = locationHistory.value[0]
      applyStructuredLocation({
        building: latest.building,
        room: latest.room,
        cabinet: latest.cabinet,
        slot: latest.slot,
        physicalLocationNote: props.detail.volume.physicalLocationNote,
      })
    }
  } catch (error) {
    showUserError(error)
    locationHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

async function handleSave() {
  const building = form.building.trim()
  const cabinet = form.cabinet.trim()
  if (!building || !cabinet) {
    message.warning('请填写楼宇与柜号')
    return
  }
  submitting.value = true
  try {
    await updateArchiveVolumePhysicalLocation({
      volumeId: props.volumeId,
      building,
      room: form.room.trim() || undefined,
      cabinet,
      slot: form.slot.trim() || undefined,
      physicalLocationNote: form.physicalLocationNote.trim() || undefined,
    })
    message.success('柜位已更新')
    emit('refreshed')
    await loadLocationHistory()
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}

function formatStructuredLocation(
  item: Pick<ArchivePhysicalLocationResponse, 'building' | 'room' | 'cabinet' | 'slot'>,
) {
  return [item.building, item.room, item.cabinet, item.slot].filter(Boolean).join(' / ')
}

function formatLocationLabel(item: ArchivePhysicalLocationResponse) {
  const structured = formatStructuredLocation(item)
  return structured || '—'
}

const displayLocation = computed(() => {
  const volume = props.detail.volume
  const structured = [
    volume.physicalBuilding,
    volume.physicalRoom,
    volume.physicalCabinet,
    volume.physicalSlot,
  ]
    .filter(Boolean)
    .join(' / ')
  return structured || '尚未登记柜位'
})

const securityLevelText = computed(() => {
  const code = props.detail.volume.securityLevel
  if (!code) return '—'
  return strictEnumLabel(ArchiveSecurityLevelDescription, code, 'securityLevel')
})

const retentionUntilText = computed(() => props.detail.volume.retentionUntil || '—')

onMounted(() => {
  void loadLocationHistory()
})
</script>

<template>
  <WorkbenchSurfaceCard class="archive-volume-physical-location">
    <template #head>
      <div class="archive-volume-physical-location__head">
        <h3 class="archive-volume-physical-location__title">物理存放位置</h3>
        <p class="archive-volume-physical-location__hint">
          结构化库位用于扫描室派单排序；仅收集中卷可修改，每次变更写入库位历史。
        </p>
      </div>
    </template>
    <template v-if="canEdit" #toolbar>
      <UiButton size="sm" variant="outline" :loading="submitting" @click="handleSave">
        更新位置
      </UiButton>
    </template>
    <section class="archive-volume-physical-location__hero">
      <div class="archive-volume-physical-location__location-text">{{ displayLocation }}</div>
      <div class="archive-volume-physical-location__hero-meta">
        密级: {{ securityLevelText }} · 保管至 {{ retentionUntilText }}
      </div>
    </section>
    <a-form layout="vertical" class="archive-volume-physical-location__form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="楼宇/库区" required>
            <a-input v-model:value="form.building" placeholder="例如 A区" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="房间/库室">
            <a-input v-model:value="form.room" placeholder="例如 03室" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="柜号"
            required
            :class="{
              'archive-volume-physical-location__field--filled': Boolean(form.cabinet.trim()),
            }"
          >
            <a-input v-model:value="form.cabinet" placeholder="例如 03柜" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="层/格位"
            :class="{
              'archive-volume-physical-location__field--filled': Boolean(form.slot.trim()),
            }"
          >
            <a-input v-model:value="form.slot" placeholder="例如 2层" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="柜位说明">
        <a-input
          v-model:value="form.physicalLocationNote"
          placeholder="可选补充说明"
          :disabled="!canEdit"
        />
      </a-form-item>
      <p v-if="!canEdit" class="archive-volume-physical-location__readonly">
        当前卷状态不允许修改柜位
      </p>
    </a-form>
    <section class="archive-volume-physical-location__timeline">
      <h3 class="archive-volume-physical-location__timeline-title">位置变更历史</h3>
      <UiSkeletonState v-if="historyLoading" variant="card" compact />
      <div
        v-else-if="locationHistory.length > 0"
        class="audit-timeline archive-volume-physical-location__audit"
      >
        <article v-for="item in locationHistory" :key="item.locationId" class="audit-item">
          <div class="audit-time">
            {{ item.effectiveTime ? formatDateTime(item.effectiveTime) : '—' }}
          </div>
          <div class="audit-body">
            <div class="audit-title">更新柜位 → {{ formatLocationLabel(item) }}</div>
            <div v-if="item.note" class="audit-desc">{{ item.note }}</div>
          </div>
        </article>
      </div>
      <p v-else class="archive-volume-physical-location__empty">暂无柜位变更记录</p>
    </section>
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-volume-physical-location__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.archive-volume-physical-location__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-physical-location__hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.archive-volume-physical-location__hero {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-4);
  padding: var(--dp-space-3);
  margin-bottom: var(--dp-space-4);
  background: var(--dp-surface-sunken);
  border-radius: var(--dp-radius-control);
}
.archive-volume-physical-location__location-text {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--dp-font-mono);
  color: var(--dp-primary);
  font-variant-numeric: tabular-nums;
}
.archive-volume-physical-location__hero-meta {
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.archive-volume-physical-location__form {
  max-width: 560px;
}
.archive-volume-physical-location__readonly {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.archive-volume-physical-location__timeline {
  margin-top: 24px;
  max-width: 640px;
}
.archive-volume-physical-location__audit {
  padding-top: 0;
}
.archive-volume-physical-location__field--filled :deep(.ant-input) {
  border-color: var(--dp-primary);
  background: color-mix(in srgb, var(--dp-primary) 4%, #fff);
}
.archive-volume-physical-location__field--filled :deep(.ant-form-item-label > label) {
  color: var(--dp-primary);
  font-weight: 600;
}
.archive-volume-physical-location__timeline-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}
.archive-volume-physical-location__empty {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
</style>
