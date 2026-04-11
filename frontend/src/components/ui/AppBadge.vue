<script setup lang="ts">
import { computed } from 'vue'

type BadgeVariant = 'muted' | 'primary' | 'success' | 'danger'
type BadgeSize = 'xs' | 'sm' | 'md'

interface Props {
    variant?: BadgeVariant
    size?: BadgeSize
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'muted',
    size: 'md',
})

const badgeClasses = computed(() => {
    const sizeClass = `ui-badge--${props.size}`
    const variantClass = `ui-badge--${props.variant}`
    return ['ui-badge', sizeClass, variantClass]
})
</script>

<template>
    <span :class="badgeClasses">
        <slot />
    </span>
</template>
