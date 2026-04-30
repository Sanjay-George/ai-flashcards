<script setup lang="ts">
import { computed } from 'vue'
import type { Lexeme } from '../../types'
import AppButton from '../ui/AppButton.vue'
import AppBadge from '../ui/AppBadge.vue'
import LexemeListItem from './LexemeListItem.vue'
import IconButton from '../ui/IconButton.vue'

interface Props {
    pendingAction: 'add' | 'remove' | 'edit' | null
    pendingAdditions: Lexeme[]
    pendingRemovals: Lexeme[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
    undo: []
    commit: []
    view: [lexeme: Lexeme]
}>()

// Zip removals and additions into paired diffs for the edit action.
// Arrays are index-aligned by the composable (matchedForEdit order).
const diffPairs = computed(() => {
    const len = Math.max(props.pendingRemovals.length, props.pendingAdditions.length)
    return Array.from({ length: len }, (_, i) => ({
        before: props.pendingRemovals[i] ?? null,
        after: props.pendingAdditions[i] ?? null,
    }))
})
</script>

<template>
    <div class="card border-primary border h-full flex flex-col">
        <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-foreground">Pending changes</h2>
            <AppBadge size="sm">
                {{ pendingAction === 'add' ? 'Adding' : pendingAction === 'remove' ? 'Removing' : 'Editing' }}
            </AppBadge>
        </div>

        <!-- Edit: unified diff view -->
        <div v-if="pendingAction === 'edit'" class="mb-3">
            <p class="text-xs text-muted-foreground mb-1.5">{{ diffPairs.length }} card{{ diffPairs.length !== 1 ? 's' : '' }} changed</p>
            <div class="flex flex-col max-h-64 overflow-y-auto border border-border font-mono text-xs" style="border-radius: 0.375rem;">
                <template
                    v-for="(pair, i) in diffPairs"
                    :key="i"
                >
                    <!-- Removed line -->
                    <div v-if="pair.before" class="flex items-center gap-2 px-2.5 py-2 bg-destructive/8">
                        <span class="shrink-0 w-3 font-bold text-destructive select-none">−</span>
                        <div class="min-w-0 flex-1 flex gap-3">
                            <span class="font-medium text-destructive/90 leading-snug line-clamp-2 shrink-0 w-[35%]">{{ pair.before.term }}</span>
                            <span class="text-destructive/60 leading-snug line-clamp-2 min-w-0">{{ pair.before.meaning }}</span>
                        </div>
                        <IconButton
                            title="Preview old card"
                            aria-label="Preview old card"
                            class="shrink-0"
                            @click="emit('view', pair.before!)"
                        >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" aria-hidden="true">
                                <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
                            </svg>
                        </IconButton>
                    </div>
                    <!-- Added line -->
                    <div v-if="pair.after" class="flex items-center gap-2 px-2.5 py-2 bg-green-500/8" :class="{ 'mb-2': i < diffPairs.length - 1 }">
                        <span class="shrink-0 w-3 font-bold text-green-700 select-none">+</span>
                        <div class="min-w-0 flex-1 flex gap-3">
                            <span class="font-medium text-green-800 leading-snug line-clamp-2 shrink-0 w-[35%]">{{ pair.after.term }}</span>
                            <span class="text-green-700/70 leading-snug line-clamp-2 min-w-0">{{ pair.after.meaning }}</span>
                        </div>
                        <IconButton
                            title="Preview new card"
                            aria-label="Preview new card"
                            class="shrink-0"
                            @click="emit('view', pair.after!)"
                        >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" aria-hidden="true">
                                <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
                            </svg>
                        </IconButton>
                    </div>
                    <!-- Separator between pairs (only between, not after last) -->
                    <div v-if="i < diffPairs.length - 1 && !pair.after" class="mb-2" />
                </template>
            </div>
        </div>

        <!-- Pure remove -->
        <div v-else-if="pendingRemovals.length > 0" class="mb-3 flex-1 min-h-0">
            <div class="flex flex-col h-full overflow-y-auto border border-border" style="border-radius: 0.375rem;">
                <LexemeListItem
                    v-for="(lexeme, index) in pendingRemovals"
                    :key="`remove-${index}`"
                    :lexeme="lexeme"
                    state="removed"
                    viewable
                    @view="emit('view', $event)"
                />
            </div>
        </div>

        <!-- Pure add -->
        <div v-else-if="pendingAdditions.length > 0" class="mb-3 flex-1 min-h-0">
            <div class="flex flex-col h-full overflow-y-auto border border-border" style="border-radius: 0.375rem;">
                <LexemeListItem
                    v-for="(lexeme, index) in pendingAdditions"
                    :key="`add-${index}`"
                    :lexeme="lexeme"
                    state="added"
                    viewable
                    @view="emit('view', $event)"
                />
            </div>
        </div>

        <div class="flex gap-2 pt-3 border-t border-border">
            <AppButton @click="emit('undo')" variant="secondary" class="flex-1">Undo</AppButton>
            <AppButton @click="emit('commit')" class="flex-1">Commit</AppButton>
        </div>
    </div>
</template>
