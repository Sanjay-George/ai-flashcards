import axios, { AxiosInstance, AxiosError } from 'axios'

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

// Response interceptor for error handling
api.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        console.error('API Error:', error.response?.data || error.message)
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
