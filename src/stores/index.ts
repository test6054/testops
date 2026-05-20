import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export * from './modules/aiTask'
export * from './modules/app'
export * from './modules/auth'
export * from './modules/markExamContext'
export * from './modules/markStage'
export * from './modules/markTask'
export * from './modules/notification'
export * from './modules/quality'
export * from './modules/qualityTask'
export * from './modules/route'
export * from './modules/tenant'
export * from './modules/user'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
