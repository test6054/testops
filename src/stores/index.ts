import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export * from './modules/app'
export * from './modules/auth'
export * from './modules/quality'
export * from './modules/route'
export * from './modules/tenant'
export * from './modules/user'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
