import type { UnwrapNestedRefs } from 'vue'
import { cloneDeep, isFunction } from 'lodash-es'
import { reactive } from 'vue'

export function useResetReactive<T extends object>(value: T): [UnwrapNestedRefs<T>, () => void] {
  const getInitValue = () => (isFunction(value) ? value() : cloneDeep(value))

  const state = reactive(getInitValue())

  const reset = () => {
    Object.keys(state).forEach((key) => delete state[key])
    Object.assign(state, getInitValue())
  }

  return [state, reset]
}
