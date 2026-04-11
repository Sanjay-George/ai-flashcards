import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'


export default defineConfig(({ mode }) => {
    // Load env file from frontend directory
    const env = loadEnv(mode, path.resolve(__dirname, '.'), '')

    return {
        plugins: [vue(), vueDevTools()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        },
        server: {
            port: 9050
        }
    }
})
