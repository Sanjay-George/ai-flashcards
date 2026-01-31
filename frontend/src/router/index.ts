import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import DeckList from '../views/DeckList.vue'
import CreateDeck from '../views/CreateDeck.vue'
import DeckDetail from '../views/DeckDetail.vue'
import StudySession from '../views/StudySession.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/decks',
        name: 'DeckList',
        component: DeckList
    },
    {
        path: '/create',
        name: 'CreateDeck',
        component: CreateDeck
    },
    {
        path: '/deck/:id',
        name: 'DeckDetail',
        component: DeckDetail
    },
    {
        path: '/study/:id',
        name: 'StudySession',
        component: StudySession
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
