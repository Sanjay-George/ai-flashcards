import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import DeckList from '../views/DeckList.vue'
import CreateDeck from '../views/CreateDeck.vue'
import EditGeneratedDeck from '../views/EditGeneratedDeck.vue'
import DeckDetail from '../views/DeckDetail.vue'
import StudySession from '../views/StudySession.vue'
import ConversationPractice from '../views/ConversationPractice.vue'
import ConversationHistory from '../views/ConversationHistory.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { guestOnly: true }
    },
    {
        path: '/decks',
        name: 'DeckList',
        component: DeckList
    },
    {
        path: '/create',
        name: 'CreateDeck',
        component: CreateDeck,
        meta: { requiresAuth: true }
    },
    {
        path: '/edit-generated-deck',
        name: 'EditGeneratedDeck',
        component: EditGeneratedDeck,
        meta: { requiresAuth: true }
    },
    {
        path: '/deck/:id',
        name: 'DeckDetail',
        component: DeckDetail
    },
    {
        path: '/study/:id',
        name: 'StudySession',
        component: StudySession,
        meta: { requiresAuth: true }
    },
    {
        path: '/conversation',
        name: 'ConversationPractice',
        component: ConversationPractice,
        meta: { requiresAuth: true }
    },
    {
        path: '/conversation/history',
        name: 'ConversationHistory',
        component: ConversationHistory,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
    // Import auth store dynamically to avoid circular deps
    const { useAuthStore } = await import('../stores/authStore')
    const authStore = useAuthStore()

    // Wait for auth to be ready
    if (authStore.loading) {
        await new Promise<void>(resolve => {
            const unwatch = setInterval(() => {
                if (!authStore.loading) {
                    clearInterval(unwatch)
                    resolve()
                }
            }, 50)
        })
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
    } else if (to.meta.guestOnly && authStore.isAuthenticated) {
        next({ name: 'DeckList' })
    } else {
        next()
    }
})

export default router
