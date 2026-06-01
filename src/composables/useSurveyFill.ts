import type { PublicSurveyItemVO, PublicSurveyVO } from '@/apis/public-survey'
import { message } from 'ant-design-vue'
/**
 * 公开问卷填写共享逻辑。
 * 供移动端（一题一页）和 PC 端（全页展示）共用。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { publicSurveyApi } from '@/apis/public-survey'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'

export function useSurveyFill() {
  const route = useRoute()
  const token = route.params.token as string

  const loading = ref(true)
  const errorMessage = ref('')
  const survey = ref<PublicSurveyVO | null>(null)
  const submitted = ref(false)
  const submitting = ref(false)
  const thankYouMessage = ref('感谢您的参与！')

  const identityValues = reactive<Record<string, string>>({})
  const scaleAnswers = reactive<Record<string, number | undefined>>({})
  const singleChoiceAnswers = reactive<Record<string, string>>({})
  const multiAnswers = reactive<Record<string, string[]>>({})
  const openTexts = reactive<Record<string, string>>({})

  const totalCount = computed(() => survey.value?.items.length ?? 0)

  const answeredCount = computed(() => {
    if (!survey.value) return 0
    let count = 0
    for (const item of survey.value.items) {
      if (isItemAnswered(item)) count++
    }
    return count
  })

  const progressPercent = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((answeredCount.value / totalCount.value) * 100)
  })

  function isItemAnswered(item: PublicSurveyItemVO): boolean {
    if (item.itemType === 'SCALE') {
      return scaleAnswers[item.itemToken] != null
    }
    if (item.itemType === 'SINGLE_CHOICE') {
      return !!singleChoiceAnswers[item.itemToken]
    }
    if (item.itemType === 'MULTI_CHOICE') {
      return multiAnswers[item.itemToken] && multiAnswers[item.itemToken].length > 0
    }
    if (item.itemType === 'OPEN_TEXT') {
      return !!(openTexts[item.itemToken] && openTexts[item.itemToken].trim())
    }
    return false
  }

  function getScaleOptions(item: PublicSurveyItemVO) {
    const min = item.scaleMin ?? 1
    const max = item.scaleMax ?? 5
    const labels = item.scaleLabels || []
    const options = []
    for (let i = min; i <= max; i++) {
      options.push({
        value: i,
        label: labels.find((label) => label.scaleValue === i)?.label || '',
      })
    }
    return options
  }

  function choiceOptionsOf(item: PublicSurveyItemVO) {
    return item.choiceOptions || []
  }

  function hasRequiredIdentityFilled() {
    if (!survey.value || survey.value.allowAnonymous) return true
    return survey.value.identityFields.every((field) => {
      return !field.required || !!identityValues[field.fieldKey]?.trim()
    })
  }

  function findFirstUnansweredRequired(): number {
    if (!survey.value) return -1
    for (let i = 0; i < survey.value.items.length; i++) {
      const item = survey.value.items[i]
      if (item.required && !isItemAnswered(item)) {
        return i
      }
    }
    return -1
  }

  function buildAnswerList() {
    if (!survey.value) return []
    return survey.value.items
      .map((item) => {
        let scaleValue: number | undefined
        let singleChoiceValue: string | undefined
        let multipleChoiceValues: string[] | undefined
        let openText: string | undefined

        if (item.itemType === 'SCALE') {
          scaleValue = scaleAnswers[item.itemToken]
        } else if (item.itemType === 'SINGLE_CHOICE') {
          singleChoiceValue = singleChoiceAnswers[item.itemToken]
        } else if (item.itemType === 'MULTI_CHOICE') {
          const selected = multiAnswers[item.itemToken]
          multipleChoiceValues = selected && selected.length > 0 ? [...selected] : undefined
        } else if (item.itemType === 'OPEN_TEXT') {
          openText = openTexts[item.itemToken]
        }

        return {
          itemToken: item.itemToken,
          scaleValue,
          singleChoiceValue,
          multipleChoiceValues,
          openText,
        }
      })
      .filter(
        (answer) =>
          answer.scaleValue != null
          || !!answer.singleChoiceValue
          || !!answer.multipleChoiceValues?.length
          || !!answer.openText?.trim(),
      )
  }

  async function loadSurvey() {
    loading.value = true
    try {
      survey.value = await publicSurveyApi.getSurvey(token)
    } catch (err) {
      if (!(err instanceof Error)) throw err
      errorMessage.value = getUserErrorMessage(err, '问卷加载失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  async function submitSurvey(): Promise<boolean> {
    if (!survey.value) return false

    const unansweredIdx = findFirstUnansweredRequired()
    if (unansweredIdx >= 0) {
      message.warning(`请完成第 ${unansweredIdx + 1} 题（必填）`)
      return false
    }
    if (!hasRequiredIdentityFilled()) {
      message.warning('请填写必填身份信息')
      return false
    }

    submitting.value = true
    try {
      const result = await publicSurveyApi.submit(token, {
        respondentIdentity: survey.value.allowAnonymous
          ? undefined
          : {
              fields: survey.value.identityFields.map((field) => ({
                fieldKey: field.fieldKey,
                fieldValue: identityValues[field.fieldKey]?.trim() || '',
              })),
            },
        answers: buildAnswerList(),
      })
      thankYouMessage.value = result.thankYouMessage || '感谢您的参与！'
      submitted.value = true
      return true
    } catch (err) {
      if (!(err instanceof Error)) throw err
      showUserError(err, '提交失败，请稍后重试')
      return false
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    loadSurvey()
  })

  return {
    token,
    loading,
    errorMessage,
    survey,
    submitted,
    submitting,
    thankYouMessage,
    identityValues,
    scaleAnswers,
    singleChoiceAnswers,
    multiAnswers,
    openTexts,
    totalCount,
    answeredCount,
    progressPercent,
    isItemAnswered,
    getScaleOptions,
    choiceOptionsOf,
    hasRequiredIdentityFilled,
    findFirstUnansweredRequired,
    submitSurvey,
  }
}
