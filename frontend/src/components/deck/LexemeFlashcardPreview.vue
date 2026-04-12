<script setup lang="ts">
import { ref } from 'vue'
import type { Lexeme } from '../../types'
import AppBadge from '../ui/AppBadge.vue'

interface Props {
    lexeme: Lexeme
}

defineProps<Props>()

const showBack = ref<boolean>(false)

const flipCard = (): void => {
    showBack.value = !showBack.value
}
</script>

<template>
    <div class="perspective-[1000px] cursor-pointer" @click="flipCard">
        <div
            class="relative w-full min-h-52 transition-transform duration-600 transform-style-preserve-3d"
            :class="{ 'rotate-y-180': showBack }"
        >
            <div
                class="absolute w-full min-h-52 backface-hidden flex flex-col items-center justify-center p-5 bg-background border border-border"
                style="border-radius: 0.5rem;"
            >
                <div class="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    Term
                </div>
                <div class="text-lg font-medium text-center text-foreground leading-relaxed wrap-break-word w-full">
                    {{ lexeme.term }}
                </div>
                <span class="mt-4 text-xs text-muted-foreground">Tap to reveal meaning</span>
            </div>

            <div
                class="absolute w-full min-h-52 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-5 bg-primary/5 text-foreground border border-primary/30"
                style="border-radius: 0.5rem;"
            >
                <div class="text-xs uppercase tracking-widest text-primary/60 mb-3">Meaning</div>
                <div class="text-lg font-medium text-center leading-relaxed wrap-break-word w-full">
                    {{ lexeme.meaning }}
                </div>
                <AppBadge v-if="lexeme.POS?.trim()" class="mt-4" size="xs">{{ lexeme.POS }}</AppBadge>
            </div>
        </div>
    </div>
</template>

<style scoped>
.perspective-\[1000px\] {
    perspective: 1000px;
}

.transform-style-preserve-3d {
    transform-style: preserve-3d;
}

.backface-hidden {
    backface-visibility: hidden;
}

.rotate-y-180 {
    transform: rotateY(180deg);
}

.duration-600 {
    transition-duration: 600ms;
}

.min-h-52 {
    min-height: 13rem;
}
</style>
