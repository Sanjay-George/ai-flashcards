<script setup lang="ts">
import type { ConversationMessage, MessageFeedback } from '../../types/index'

defineProps<{
    messages: ConversationMessage[]
    getMessageFeedback: (messageIndex: number) => MessageFeedback | undefined
    feedbackCategoryLabel: (category: string) => string
    showTranslations?: boolean
}>()
</script>

<template>
    <div class="space-y-1.5 max-h-100 overflow-y-auto">
        <div v-for="(msg, idx) in messages" :key="idx" :class="[
            'p-2.5 text-sm',
            msg.role === 'user'
                ? 'bg-primary/10 text-foreground border border-border ml-8'
                : 'bg-secondary text-foreground mr-8'
        ]" style="border-radius: 0.375rem;">
            <span class="text-xs font-medium opacity-50">
                {{ msg.role === 'user' ? 'You' : 'AI' }}
            </span>
            <p class="mt-0.5 whitespace-pre-wrap">{{ msg.content }}</p>

            <div v-if="msg.role === 'user' && getMessageFeedback(idx)"
                class="mt-2 pt-2 border-t border-border space-y-1.5">
                <span
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border px-1.5 py-0.5"
                    style="border-radius: 0.25rem;">
                    {{ feedbackCategoryLabel(getMessageFeedback(idx)!.category) }}
                </span>

                <div v-if="getMessageFeedback(idx)!.corrected !== getMessageFeedback(idx)!.original"
                    class="space-y-1 text-xs">
                    <div class="flex items-start gap-2">
                        <span class="text-destructive mt-0.5 shrink-0">&times;</span>
                        <span class="line-through opacity-60">{{ getMessageFeedback(idx)!.original }}</span>
                    </div>
                    <div class="flex items-start gap-2">
                        <span class="text-foreground mt-0.5 shrink-0">→</span>
                        <span class="font-medium">{{ getMessageFeedback(idx)!.corrected }}</span>
                    </div>
                </div>
                <div v-else class="text-xs">
                    <span class="font-medium">{{ getMessageFeedback(idx)!.corrected }}</span>
                </div>

                <p class="text-xs text-muted-foreground">{{ getMessageFeedback(idx)!.explanation }}</p>
            </div>

            <div v-if="showTranslations && msg.translation" class="mt-1.5 text-xs text-muted-foreground italic">
                {{ msg.translation }}
            </div>
        </div>
    </div>
</template>
