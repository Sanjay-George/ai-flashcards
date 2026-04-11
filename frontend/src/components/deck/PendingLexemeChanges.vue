<script setup lang="ts">
import type { Lexeme } from '../../types'
import AppButton from '../ui/AppButton.vue'
import AppBadge from '../ui/AppBadge.vue'
import LexemeListItem from './LexemeListItem.vue'

interface Props {
    pendingAction: 'add' | 'remove' | 'edit' | null
    pendingAdditions: Lexeme[]
    pendingRemovals: Lexeme[]
}

defineProps<Props>()

const emit = defineEmits<{
    undo: []
    commit: []
}>()
</script>

<template>
    <div class="card border-primary border">
        <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-foreground">Pending changes</h2>
            <AppBadge size="sm">
                {{ pendingAction === 'add' ? 'Adding' : pendingAction === 'remove' ? 'Removing' : 'Editing' }}
            </AppBadge>
        </div>

        <div v-if="pendingRemovals.length > 0" class="mb-3">
            <h3 class="text-xs font-medium text-destructive mb-1.5">Removing ({{ pendingRemovals.length }})</h3>
            <div class="flex flex-col max-h-48 overflow-y-auto border border-border" style="border-radius: 0.375rem;">
                <LexemeListItem
                    v-for="(lexeme, index) in pendingRemovals"
                    :key="`remove-${index}`"
                    :lexeme="lexeme"
                    state="removed"
                />
            </div>
        </div>

        <div v-if="pendingAdditions.length > 0" class="mb-3">
            <h3 class="text-xs font-medium text-green-700 mb-1.5">Adding ({{ pendingAdditions.length }})</h3>
            <div class="flex flex-col max-h-48 overflow-y-auto border border-border" style="border-radius: 0.375rem;">
                <LexemeListItem
                    v-for="(lexeme, index) in pendingAdditions"
                    :key="`add-${index}`"
                    :lexeme="lexeme"
                    state="added"
                />
            </div>
        </div>

        <div class="flex gap-2 pt-3 border-t border-border">
            <AppButton @click="emit('undo')" variant="secondary" class="flex-1">Undo</AppButton>
            <AppButton @click="emit('commit')" class="flex-1">Commit</AppButton>
        </div>
    </div>
</template>
