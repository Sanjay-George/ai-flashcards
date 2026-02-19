import { ILexeme } from "../types";
import chalk from 'chalk';

/**
 * SM-2 Spaced Repetition Algorithm
 * Rating scale: 1-5 (1 = complete failure, 5 = perfect)
 */
export function calculateSRS(
    rating: number,
    currentEaseFactor: number,
    currentInterval: number,
    currentRepetitions: number
): { easeFactor: number; interval: number; repetitions: number; nextReviewDate: Date } {

    // Map 1-5 rating to SM-2 quality (0-5): 1->0, 2->1, 3->3, 4->4, 5->5
    const qualityMap: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5 };
    const quality = qualityMap[rating] ?? 3;

    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // If quality < 3, reset repetitions (card was failed)
    if (quality < 3) {
        repetitions = 0;
        interval = 0; // Review immediately on next session
    } else {
        // Card was successful
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 2;
        } else {
            interval = Math.round(currentInterval * easeFactor);
        }
        repetitions += 1;
    }

    // Update ease factor (minimum 1.3)
    easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return { easeFactor, interval, repetitions, nextReviewDate };
}

export function getDueLexemes(lexemes: ILexeme[], limit: number = 10) {
    const selectedLexemes: any[] = [];
    const allLexemes = [...lexemes];
    const now = new Date();
    const isFirstTime = (l: ILexeme) => (l.repetitions || 0) === 0 && (!l.lastReviewed);

    // Rule 1: First-time words (never seen before)
    const firstTimeWords = allLexemes.filter(isFirstTime);

    // Shuffle first-time words for variety
    const shuffledFirstTime = firstTimeWords.sort(() => Math.random() - 0.5);
    selectedLexemes.push(...shuffledFirstTime.slice(0, limit));

    // If we have enough, return
    if (selectedLexemes.length >= limit) {
        return selectedLexemes.slice(0, limit);
    }

    // Rule 2: Due for review (based on SRS data)
    const dueWords = allLexemes.filter((l: any) => {
        const nextReview = new Date(l.nextReviewDate || 0);
        return !isFirstTime(l) && nextReview <= now;
    });

    // Sort due words by priority:
    // - Earlier review dates first (most overdue)
    // - Lower ease factor (harder cards)
    // - Lower repetitions (less mastered)
    const sortedDueWords = dueWords.sort((a: any, b: any) => {
        const aDate = new Date(a.nextReviewDate || 0).getTime();
        const bDate = new Date(b.nextReviewDate || 0).getTime();

        if (aDate !== bDate) return aDate - bDate;

        const aEase = a.easeFactor || 2.5;
        const bEase = b.easeFactor || 2.5;
        if (aEase !== bEase) return aEase - bEase;

        return (a.repetitions || 0) - (b.repetitions || 0);
    });

    const remaining = limit - selectedLexemes.length;
    selectedLexemes.push(...sortedDueWords.slice(0, remaining));

    // If we have enough, return
    if (selectedLexemes.length >= limit) {
        return selectedLexemes.slice(0, limit);
    }

    // Rule 3: Fallback - random selection from remaining lexemes
    const usedTerms = new Set(selectedLexemes.map((l: any) => l.term));
    const remainingWords = allLexemes.filter((l: any) => !usedTerms.has(l.term));

    // Shuffle remaining words
    const shuffledRemaining = remainingWords.sort(() => Math.random() - 0.5);
    const stillNeeded = limit - selectedLexemes.length;
    selectedLexemes.push(...shuffledRemaining.slice(0, stillNeeded));

    return selectedLexemes.slice(0, limit);
}