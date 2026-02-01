import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Backend API client (decks, flashcards)
const api: AxiosInstance = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// AI Service client (direct to AI service)
export const aiApi: AxiosInstance = axios.create({
    baseURL: '/ai',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Dynamically import to avoid circular dependencies
        const { useAuthStore } = await import('../stores/authStore')
        const authStore = useAuthStore()

        const token = await authStore.getToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        console.error('API Error:', error.response?.data || error.message)

        // Handle 401 unauthorized - redirect to login
        if (error.response?.status === 401) {
            window.location.href = '/login'
        }

        return Promise.reject(error)
    }
)

aiApi.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        console.error('AI API Error:', error.response?.data || error.message)
        return Promise.reject(error)
    }
)

export default api
