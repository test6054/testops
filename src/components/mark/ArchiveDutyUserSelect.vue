<!--
  归档职责授权用户选择器
  数据源：POST /api/tenant/admin/users（远程搜索）；已选用户通过 POST /api/tenant/admin/user/detail 回显
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { UserDetailDto, UserListItemDto } from '@/apis/edu/admin-user'
import { onMounted, ref, watch } from 'vue'
import { getTenantUserDetail, getTenantUserList } from '@/apis/edu/tenant-user-management'
import { requirePageList } from '@/components/quality/selectors/page-contract'
import { showUserError } from '@/utils/error-handler'

interface Props {
  value?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择用户',
  allowClear: true,
  disabled: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
}>()

const options = ref<UserListItemDto[]>([])
const loading = ref(false)
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (value) => {
    internalValue.value = value ?? undefined
  },
)

function userLabel(user: Pick<UserListItemDto, 'nickName' | 'identifierNumber'>): string {
  const suffix = user.identifierNumber ? ` (${user.identifierNumber})` : ''
  return `${user.nickName}${suffix}`
}

function mergeOptions(users: UserListItemDto[]) {
  const map = new Map(options.value.map(item => [item.id, item]))
  for (const user of users) {
    map.set(user.id, user)
  }
  options.value = Array.from(map.values())
}

function toListItem(user: UserDetailDto): UserListItemDto {
  return {
    id: user.id,
    userName: user.userName,
    nickName: user.nickName,
    email: user.email,
    mobile: user.mobile,
    identifierNumber: user.identifierNumber,
    status: user.status,
    createTime: user.createTime,
  }
}

async function hydrateById(userId: string) {
  try {
    const detail = await getTenantUserDetail({ id: userId })
    mergeOptions([toListItem(detail)])
  }
  catch (error) {
    showUserError(error, '用户回显加载失败')
  }
}

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    const res = await getTenantUserList({
      pageNum: 1,
      pageSize: 50,
      keyword: keyword?.trim() || undefined,
    })
    mergeOptions(requirePageList(res, '用户'))
  }
  catch (error) {
    showUserError(error, '用户列表加载失败')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.value,
  (userId) => {
    if (userId && !options.value.some(item => item.id === userId)) {
      void hydrateById(userId)
    }
  },
  { immediate: true },
)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(keyword: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    void loadOptions(keyword)
  }, 300)
}

function handleChange(value: SelectValue) {
  const next = typeof value === 'string' ? value : null
  internalValue.value = next ?? undefined
  emit('update:value', next)
}

onMounted(() => {
  void loadOptions()
})

defineExpose({ reload: loadOptions, hydrateById })
</script>

<template>
  <a-select
    :value="internalValue"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    style="width: 100%"
    show-search
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="userLabel(opt)"
    >
      {{ userLabel(opt) }}
      <span v-if="opt.departmentName || opt.department" class="archive-duty-user-select__dept">
        {{ opt.departmentName || opt.department }}
      </span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.archive-duty-user-select__dept {
  margin-left: 4px;
  color: var(--dp-color-text-tertiary, #999);
  font-size: 12px;
}
</style>
