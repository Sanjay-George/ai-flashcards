<script setup lang="ts">
import { computed } from 'vue'
import type { Lexeme } from '../../types'
import AppBadge from '../ui/AppBadge.vue'
import IconButton from '../ui/IconButton.vue'

interface Props {
    lexeme: Lexeme
    state?: 'default' | 'added' | 'removed'
    removable?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    state: 'default',
    removable: false,
    disabled: false,
})

const emit = defineEmits<{
    remove: [term: string]
}>()

const rowStateClass = computed(() => {
    if (props.state === 'added') return 'lexeme-row--added'
    if (props.state === 'removed') return 'lexeme-row--removed'
    return ''
})

const onRemove = () => {
    if (!props.disabled) {
        emit('remove', props.lexeme.term)
    }
}
</script>

<template>
    <div :class="['lexeme-row', rowStateClass, removable ? 'lexeme-row--removable' : 'lexeme-row--readonly']">
        <div class="lexeme-row__term">{{ lexeme.term }}</div>
        <div class="lexeme-row__meaning">{{ lexeme.meaning }}</div>
        <div class="lexeme-row__pos">
            <AppBadge v-if="lexeme.POS?.trim()" size="xs" class="w-full justify-center">{{ lexeme.POS }}</AppBadge>
        </div>
        <IconButton
            v-if="removable"
            variant="danger"
            title="Remove"
            :disabled="disabled"
            @click="onRemove"
        >
            &times;
        </IconButton>
    </div>
</template>
