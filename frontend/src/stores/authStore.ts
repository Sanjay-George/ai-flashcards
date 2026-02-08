import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    googleProvider,
    signOut,
    onAuthStateChanged,
    User
} from '../services/firebase'

export interface AuthUser {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<AuthUser | null>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)
    const token = ref<string | null>(null)

    // Computed
    const isAuthenticated = computed(() => !!user.value)
    const userId = computed(() => user.value?.uid ?? null)

    // Initialize auth state listener
    const initAuth = () => {
        return new Promise<void>((resolve) => {
            onAuthStateChanged(auth, async (firebaseUser: User | null) => {
                if (firebaseUser) {
                    user.value = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL
                    }
                    // Get ID token for API calls
                    token.value = await firebaseUser.getIdToken()
                } else {
                    user.value = null
                    token.value = null
                }
                loading.value = false
                resolve()
            })
        })
    }

    // Get fresh token (for API calls)
    const getToken = async (): Promise<string | null> => {
        if (auth.currentUser) {
            token.value = await auth.currentUser.getIdToken()
            return token.value
        }
        return null
    }

    // Sign in with email/password
    const login = async (email: string, password: string) => {
        loading.value = true
        error.value = null
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            token.value = await result.user.getIdToken()
        } catch (e: unknown) {
            error.value = getErrorMessage(e.code)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Sign up with email/password
    const signup = async (email: string, password: string) => {
        loading.value = true
        error.value = null
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password)
            token.value = await result.user.getIdToken()
        } catch (e: any) {
            error.value = getErrorMessage(e.code)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Sign in with Google
    const loginWithGoogle = async () => {
        loading.value = true
        error.value = null
        try {
            const result = await signInWithPopup(auth, googleProvider)
            token.value = await result.user.getIdToken()
        } catch (e: any) {
            error.value = getErrorMessage(e.code)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Sign out
    const logout = async () => {
        loading.value = true
        error.value = null
        try {
            await signOut(auth)
            user.value = null
            token.value = null
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Helper: Map Firebase error codes to user-friendly messages
    const getErrorMessage = (code: string): string => {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered'
            case 'auth/invalid-email':
                return 'Invalid email address'
            case 'auth/operation-not-allowed':
                return 'Operation not allowed'
            case 'auth/weak-password':
                return 'Password is too weak (min 6 characters)'
            case 'auth/user-disabled':
                return 'This account has been disabled'
            case 'auth/user-not-found':
                return 'No account found with this email'
            case 'auth/wrong-password':
                return 'Incorrect password'
            case 'auth/invalid-credential':
                return 'Invalid email or password'
            case 'auth/popup-closed-by-user':
                return 'Sign-in popup was closed'
            default:
                return 'An error occurred. Please try again.'
        }
    }

    return {
        user,
        loading,
        error,
        token,
        isAuthenticated,
        userId,
        initAuth,
        getToken,
        login,
        signup,
        loginWithGoogle,
        logout
    }
})
