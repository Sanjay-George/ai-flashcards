<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref('')
const isSubmitting = ref(false)

const toggleMode = () => {
    isSignUp.value = !isSignUp.value
    localError.value = ''
    password.value = ''
    confirmPassword.value = ''
}

const handleSubmit = async () => {
    localError.value = ''

    if (!email.value || !password.value) {
        localError.value = 'Please fill in all fields'
        return
    }

    if (isSignUp.value && password.value !== confirmPassword.value) {
        localError.value = 'Passwords do not match'
        return
    }

    if (isSignUp.value && password.value.length < 6) {
        localError.value = 'Password must be at least 6 characters'
        return
    }

    isSubmitting.value = true

    try {
        if (isSignUp.value) {
            await authStore.signup(email.value, password.value)
        } else {
            await authStore.login(email.value, password.value)
        }
        router.push('/decks')
    } catch (e) {
        localError.value = authStore.error || 'Authentication failed'
    } finally {
        isSubmitting.value = false
    }
}

const handleGoogleSignIn = async () => {
    isSubmitting.value = true
    localError.value = ''

    try {
        await authStore.loginWithGoogle()
        router.push('/decks')
    } catch (e) {
        localError.value = authStore.error || 'Google sign-in failed'
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-0">
        <div class="w-full max-w-sm">
            <div class="mb-6">
                <h1 class="text-xl font-semibold text-foreground mb-1">
                    {{ isSignUp ? 'Create an account' : 'Sign in' }}
                </h1>
                <p class="text-sm text-muted-foreground">
                    {{ isSignUp ? 'Enter your details to get started' : 'Enter your credentials to continue' }}
                </p>
            </div>

            <button @click="handleGoogleSignIn" :disabled="isSubmitting"
                class="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border bg-background hover:bg-secondary transition-colors text-sm cursor-pointer"
                style="border-radius: 0.375rem;">
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span class="text-foreground text-sm">Continue with Google</span>
            </button>

            <div class="relative my-5">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-border"></div>
                </div>
                <div class="relative flex justify-center text-xs">
                    <span class="px-3 bg-background text-muted-foreground">or</span>
                </div>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input id="email" v-model="email" type="email" class="form-control" placeholder="you@example.com"
                        :disabled="isSubmitting" required />
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input id="password" v-model="password" type="password" class="form-control" placeholder="••••••••"
                        :disabled="isSubmitting" required />
                </div>

                <div v-if="isSignUp" class="form-group">
                    <label for="confirmPassword">Confirm password</label>
                    <input id="confirmPassword" v-model="confirmPassword" type="password" class="form-control"
                        placeholder="••••••••" :disabled="isSubmitting" required />
                </div>

                <div v-if="localError" class="bg-destructive/10 text-destructive p-3 text-sm"
                    style="border-radius: 0.375rem;">
                    {{ localError }}
                </div>

                <button type="submit" class="btn btn-primary w-full" :disabled="isSubmitting">
                    <span v-if="isSubmitting">
                        <span
                            class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        {{ isSignUp ? 'Creating account...' : 'Signing in...' }}
                    </span>
                    <span v-else>
                        {{ isSignUp ? 'Create account' : 'Sign in' }}
                    </span>
                </button>
            </form>

            <p class="text-center mt-5 text-sm text-muted-foreground">
                {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
                <button @click="toggleMode" class="text-primary hover:underline font-medium ml-1 cursor-pointer">
                    {{ isSignUp ? 'Sign in' : 'Sign up' }}
                </button>
            </p>
        </div>
    </div>
</template>
