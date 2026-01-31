import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
    // Load env file from frontend directory
    const env = loadEnv(mode, path.resolve(__dirname, '.'), '')
    const backendPort = env.VITE_BACKEND_PORT || '9051'
    const aiServicePort = env.VITE_AI_SERVICE_PORT || '9052'

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
                    target: `http://localhost:${backendPort}`,
                    changeOrigin: true
                },
                '/ai': {
                    target: `http://localhost:${aiServicePort}`,
                    changeOrigin: true
                }
            }
        }
    }
})
