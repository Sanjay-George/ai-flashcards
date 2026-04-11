<script setup lang="ts">
import { computed } from 'vue'

type IconButtonVariant = 'default' | 'danger'

interface Props {
    variant?: IconButtonVariant
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    title?: string
    ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    type: 'button',
    disabled: false,
    title: '',
    ariaLabel: '',
})

const buttonClasses = computed(() => {
    if (props.variant === 'danger') {
        return ['icon-btn', 'icon-btn-danger']
    }
    return ['icon-btn']
})

const resolvedAriaLabel = computed(() => props.ariaLabel || props.title || 'Icon button')
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        :class="buttonClasses"
        :title="title"
        :aria-label="resolvedAriaLabel"
    >
        <slot />
    </button>
</template>
