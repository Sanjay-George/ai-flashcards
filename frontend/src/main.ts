import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth before mounting
import { useAuthStore } from './stores/authStore'
const authStore = useAuthStore(pinia)
authStore.initAuth().then(() => {
    app.mount('#app')
})
