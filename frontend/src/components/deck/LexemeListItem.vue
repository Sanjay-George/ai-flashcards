<script setup lang="ts">
import { computed } from 'vue'
import type { Lexeme } from '../../types'
import IconButton from '../ui/IconButton.vue'

interface Props {
    lexeme: Lexeme
    state?: 'default' | 'added' | 'removed'
    removable?: boolean
    viewable?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    state: 'default',
    removable: false,
    viewable: false,
    disabled: false,
})

const emit = defineEmits<{
    remove: [term: string]
    view: [lexeme: Lexeme]
}>()

const rowStateClass = computed(() => {
    if (props.state === 'added') return 'bg-green-500/5'
    if (props.state === 'removed') return 'bg-destructive/5 opacity-60'
    return ''
})

const onRemove = () => {
    if (!props.disabled) {
        emit('remove', props.lexeme.term)
    }
}

const onView = () => {
    emit('view', props.lexeme)
}
</script>

<template>
    <div :class="['min-h-14 px-3 py-2.5 border-b border-border last:border-0 flex items-center gap-3', rowStateClass]">
        <div class="min-w-0 flex-5 font-medium text-sm text-foreground leading-snug wrap-break-word line-clamp-2">
            {{ lexeme.term }}
        </div>
        <div class="min-w-0 w-fit flex-8 text-xs text-muted-foreground leading-snug wrap-break-word line-clamp-2">
            {{ lexeme.meaning }}
        </div>
        <!-- <div class="shrink-0 w-20">
            <component :is="AppBadge" v-if="lexeme.POS?.trim()" size="xs" class="w-full justify-center">
                {{ lexeme.POS }}
            </component>
        </div> -->
        <div v-if="removable || viewable" class="shrink-0 w-19 flex items-center justify-end gap-1">
            <IconButton
                v-if="viewable"
                title="View as flashcard"
                aria-label="View as flashcard"
                @click="onView"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    aria-hidden="true"
                >
                    <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" />
                </svg>
            </IconButton>
            <IconButton
                v-if="removable"
                variant="danger"
                title="Remove"
                aria-label="Remove"
                :disabled="disabled"
                @click="onRemove"
            >
                &times;
            </IconButton>
        </div>
    </div>
</template>
