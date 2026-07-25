<script setup lang="ts">
// MVR-949：props.can* 写控制流仅认 === true
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
import type {
  ArchivePhysicalLocationResponse,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ArchiveSecurityLevelDescription,
  listArchivePhysicalLocationHistory,
  updateArchiveVolumePhysicalLocation,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = withDefaults(
  defineProps<{

  volumeId: string
  detail: ArchiveVolumeDetailResponse
  canEdit?: boolean
}>(),
  {
  canEdit: false,
  },
)

const emit = defineEmits<{
  refreshed: []
}>()

const submitting = ref(false)
const historyLoading = ref(false)
const historyLoadFailed = ref(false)
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
    historyLoadFailed.value = false
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
    showUserError(error, '加载柜位历史失败')
    historyLoadFailed.value = true
  } finally {
    historyLoading.value = false
  }
}

async function handleSave() {
  if (submitting.value === true) return
  // MVR-303：与 canEdit 同源二次拦截
  if (props.canEdit !== true) {
    void message.warning('当前账号无柜位维护权限')
    return
  }
  const building = form.building.trim()
  const cabinet = form.cabinet.trim()
  if (!building || !cabinet) {
    showFormValidationMessage('请填写楼宇与柜号')
    return
  }
  submitting.value = true
  try {
    await updateArchiveVolumePhysicalLocation({
      volumeId: props.volumeId,
      expectedPhysicalLocationId: props.detail.volume.physicalLocationId ?? null,
      building,
      room: form.room.trim() || undefined,
      cabinet,
      slot: form.slot.trim() || undefined,
      physicalLocationNote: form.physicalLocationNote.trim() || undefined,
    })
    void message.success('柜位已更新')
    emit('refreshed')
    await loadLocationHistory()
  } catch (error) {
    showUserError(error, '更新柜位失败')
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
  <WorkbenchSurfaceCard embedded class="archive-volume-physical-location">
    <template #head>
      <div class="archive-volume-physical-location__head">
        <h3 class="archive-volume-physical-location__title">物理存放位置</h3>
        <p class="archive-volume-physical-location__hint">
          结构化库位用于扫描室派单排序；仅收集中卷可修改，每次变更写入库位历史。
        </p>
      </div>
    </template>
    <template v-if="canEdit === true" #toolbar>
      <UiButton size="sm" variant="outline" :loading="submitting === true" @click="handleSave">
        更新位置
      </UiButton>
    </template>
    <section class="archive-volume-physical-location__hero">
      <div class="archive-volume-physical-location__location-text">{{ displayLocation }}</div>
      <div class="archive-volume-physical-location__hero-meta">
        密级: {{ securityLevelText }} · 保管至 {{ retentionUntilText }}
      </div>
    </section>
    <UiForm layout="vertical" class="archive-volume-physical-location__form">
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="楼宇/库区" required>
            <UiInput
              size="sm"
              v-model="form.building"
              :maxlength="128"
              placeholder="例如 A区"
              :disabled="canEdit !== true"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="房间/库室">
            <UiInput
              size="sm"
              v-model="form.room"
              :maxlength="128"
              placeholder="例如 03室"
              :disabled="canEdit !== true"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="柜号"
            required
            :class="{
              'archive-volume-physical-location__field--filled': Boolean(form.cabinet.trim()),
            }"
          >
            <UiInput
              size="sm"
              v-model="form.cabinet"
              :maxlength="128"
              placeholder="例如 03柜"
              :disabled="canEdit !== true"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="层/格位"
            :class="{
              'archive-volume-physical-location__field--filled': Boolean(form.slot.trim()),
            }"
          >
            <UiInput
              size="sm"
              v-model="form.slot"
              :maxlength="128"
              placeholder="例如 2层"
              :disabled="canEdit !== true"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="柜位说明">
        <UiInput
          size="sm"
          v-model="form.physicalLocationNote"
          :maxlength="512"
          placeholder="可选补充说明"
          :disabled="canEdit !== true"
        />
      </UiFormItem>
      <p v-if="canEdit !== true" class="archive-volume-physical-location__readonly">
        当前卷状态不允许修改柜位
      </p>
    </UiForm>
    <section class="archive-volume-physical-location__timeline">
      <h3 class="archive-volume-physical-location__timeline-title">位置变更历史</h3>
      <UiSkeletonState v-if="historyLoading" variant="card" compact />
      <div v-else-if="historyLoadFailed" class="archive-volume-physical-location__history-error">
        <p>位置变更历史加载失败</p>
        <UiButton size="sm" variant="outline" @click="loadLocationHistory">重试</UiButton>
      </div>
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
  font-family: var(--dp-font-mono), monospace;
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
  color: var(--dp-text-secondary);
}
.archive-volume-physical-location__timeline {
  margin-top: var(--dp-space-4, 16px);
  max-width: 640px;
}
.archive-volume-physical-location__audit {
  padding-top: 0;
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
  color: var(--dp-text-secondary);
}

.archive-volume-physical-location__history-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.archive-volume-physical-location__history-error p {
  margin: 0;
  color: var(--dp-text-secondary);
}
</style>
