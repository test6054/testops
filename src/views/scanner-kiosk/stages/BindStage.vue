<script setup lang="ts">
// MVR-950：残留 can* 控制流仅认 === true
/**
 * 独立路由：考试绑定（全屏，非 Teleport 遮罩）。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import KioskExamPickPanel from '../components/KioskExamPickPanel.vue'
import { useKioskCtx } from '../composables/kioskInjection'
import { SCANNER_EXAM_SETUP_ROUTE } from '../composables/useKioskExamRouteGuard'
import '../styles/exam-pick-gate.scss'

const { workflow } = useKioskCtx()
const router = useRouter()

const binding = ref(false)

const scanReadyCount = computed(() => workflow.bindExamCandidateTotal.value)

const statusLabel = computed(() => {
  if (workflow.bindExamCandidateLoading.value === true) return '加载考试中'
  if (workflow.bindExamCandidateLoadIssue.value) return '考试列表加载失败'
  if (scanReadyCount.value <= 0) return '暂无可扫描考试'
  return `${scanReadyCount.value} 场可扫描`
})

const endpointLabel = computed(() => {
  const device = workflow.kioskContext.value?.device
  return device?.deviceName?.trim() || device?.scannerDeviceId || '扫描工位'
})

const bindErrorMessage = computed(() => workflow.errorMessage.value.trim())

function goHub() {
  if (binding.value) return
  void router.push('/scanner-kiosk')
}

/** 触碰考试磁贴后立即绑定，并在成功后进入扫描准备阶段。 */
async function bindExam(examId: string) {
  const targetExamId = examId.trim()
  if (!targetExamId || binding.value === true) return
  binding.value = true
  workflow.errorMessage.value = ''
  try {
    await workflow.bindKioskExam(targetExamId)
    await router.replace({ name: SCANNER_EXAM_SETUP_ROUTE })
  } catch {
    // bindKioskExam 已写入 workflow.errorMessage 并弹出用户提示
  } finally {
    binding.value = false
  }
}

onMounted(() => {
  workflow.resetBindExamCandidateFilter()
  void workflow.loadBindExamCandidates()
})
</script>

<template>
  <div class="exam-gate" role="main">
    <header class="exam-gate__bar">
      <div class="exam-gate__brand">
        <div class="exam-gate__logo" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--kiosk-primary)" />
            <path
              d="M9 11h14M9 16h14M9 21h9"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="exam-gate__brand-text">
          <span class="exam-gate__brand-title">扫描工作站</span>
          <span class="exam-gate__brand-sub">{{ endpointLabel }}</span>
        </div>
      </div>

      <div class="exam-gate__status">
        <span class="exam-gate__status-dot" />
        <span>{{ statusLabel }}</span>
      </div>

      <div class="exam-gate__bar-action">
        <button
          type="button"
          class="exam-gate__ghost-btn"
          :disabled="binding"
          @click="goHub"
        >
          返回
        </button>
      </div>
    </header>

    <main class="exam-gate__main">
      <div class="exam-gate__context">
        <h1 class="exam-gate__heading">选择扫描考试</h1>
        <p class="exam-gate__heading-sub">触碰考试卡片后立即进入扫描工作台</p>
      </div>

      <KioskExamPickPanel
        class="exam-gate__panel"
        :class="{ 'exam-gate__panel--busy': binding === true || workflow.bindExamCandidateLoading.value === true }"
        :interaction-locked="binding === true"
        @confirm="bindExam"
      />

      <p v-if="bindErrorMessage" class="exam-gate__bind-error" role="alert">
        {{ bindErrorMessage }}
      </p>
    </main>
  </div>
</template>

<style scoped lang="scss">
.exam-gate {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--kiosk-page-bg);
}

.exam-gate__bind-error {
  margin: 0;
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: rgba(207, 19, 34, 0.08);
  color: var(--kiosk-danger);
  font-size: var(--kiosk-fz-body);
  line-height: 1.5;
}

.exam-gate__ghost-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
