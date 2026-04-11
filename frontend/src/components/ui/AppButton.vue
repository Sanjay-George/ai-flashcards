<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface Props {
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    block: false,
})

const variantClass = computed(() => {
    switch (props.variant) {
        case 'secondary':
            return 'btn-secondary'
        case 'outline':
            return 'btn-outline'
        case 'danger':
            return 'btn-danger'
        case 'primary':
        default:
            return 'btn-primary'
    }
})

const sizeClass = computed(() => {
    if (props.size === 'xs') return 'btn-xs'
    if (props.size === 'sm') return 'btn-sm'
    if (props.size === 'lg') return 'btn-lg'
    return 'btn-md'
})

const buttonClasses = computed(() => [
    'btn',
    variantClass.value,
    sizeClass.value,
    props.block ? 'w-full' : '',
])
</script>

<template>
    <button :type="type" :disabled="disabled" :class="buttonClasses">
        <slot />
    </button>
</template>
