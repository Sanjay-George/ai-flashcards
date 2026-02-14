import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
    // Load env file from frontend directory
    const env = loadEnv(mode, path.resolve(__dirname, '.'), '')

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        },
        server: {
            port: 9050,
            proxy: {
                '/api': {
                    target: `${env.VITE_BACKEND_URL || 'http://localhost:9051'}`,
                    changeOrigin: true
                },
                '/ai': {
                    target: `${env.VITE_AI_SERVICE_URL || 'http://localhost:9052'}`,
                    changeOrigin: true
                }
            }
        }
    }
})
