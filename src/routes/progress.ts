import { Router } from 'express';
import type { Response } from 'express';
import { Deck } from '../models/Deck.js';
import { UserProgress } from '../models/UserProgress.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Milestone definitions - meaningful, well-paced progression
 * XP thresholds are designed so early levels come quickly (motivation),
 * mid-levels require steady effort, and late levels reward dedication.
 */
const MILESTONES = [
    { level: 1, title: 'Newcomer', xpRequired: 0, emoji: '🌱', description: 'Every journey begins with a single word' },
    { level: 2, title: 'Curious Learner', xpRequired: 50, emoji: '🔍', description: 'You\'ve started building your foundation' },
    { level: 3, title: 'Word Collector', xpRequired: 150, emoji: '📖', description: 'Your vocabulary is growing steadily' },
    { level: 4, title: 'Steady Student', xpRequired: 350, emoji: '📝', description: 'Consistency is paying off' },
    { level: 5, title: 'Dedicated Learner', xpRequired: 600, emoji: '🎯', description: 'You\'re developing real language instinct' },
    { level: 6, title: 'Rising Scholar', xpRequired: 1000, emoji: '📚', description: 'Words are becoming second nature' },
    { level: 7, title: 'Language Enthusiast', xpRequired: 1700, emoji: '🌟', description: 'Your persistence is impressive' },
    { level: 8, title: 'Vocabulary Artisan', xpRequired: 2500, emoji: '⚡', description: 'You craft meaning with precision' },
    { level: 9, title: 'Word Master', xpRequired: 3500, emoji: '🏆', description: 'Few reach this level of mastery' },
    { level: 10, title: 'Polyglot Legend', xpRequired: 5000, emoji: '👑', description: 'A true master of languages' },
];

/**
 * Calculate XP earned from a study session.
 * 
 * XP Formula:
 * - Base: 2 XP per card studied
 * - Quality bonus: +1 XP per card for avg rating >= 3, +2 for >= 4
 * - Completion bonus: +10 XP if full session (>= 5 cards) completed
 * - Streak bonus: +5 XP if studying on consecutive days
 * 
 * A typical 10-card session with decent performance earns ~30-40 XP.
 * This means reaching Level 2 takes ~2 sessions (achievable in day 1),
 * and Level 10 takes ~100-130 sessions of sustained effort.
 */
function calculateSessionXP(
    cardsStudied: number,
    avgRating: number,
    isStreakDay: boolean
): number {
    // Base XP: 2 per card
    let xp = cardsStudied * 2;

    // Quality bonus
    if (avgRating >= 4) {
        xp += cardsStudied * 2; // Strong performance
    } else if (avgRating >= 3) {
        xp += cardsStudied * 1; // Good performance
    }

    // Session completion bonus (for studying 5+ cards)
    if (cardsStudied >= 5) {
        xp += 10;
    }

    // Streak bonus
    if (isStreakDay) {
        xp += 5;
    }

    return xp;
}

/**
 * Calculate level from total XP
 */
function calculateLevel(totalXP: number): number {
    let level = 1;
    for (const milestone of MILESTONES) {
        if (totalXP >= milestone.xpRequired) {
            level = milestone.level;
        } else {
            break;
        }
    }
    return level;
}

/**
 * Check if two dates are consecutive days
 */
function isConsecutiveDay(lastDate: Date | null, currentDate: Date): boolean {
    if (!lastDate) return false;
    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);
    const diffMs = current.getTime() - last.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays === 1;
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date | null, date2: Date): boolean {
    if (!date1) return false;
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
}

/**
 * Calculate mastery percentage for a deck based on lexeme ease factors.
 * 
 * Mastery levels (based on SM-2 easeFactor):
 * - New (easeFactor=2.5, repetitions=0): 0% contribution
 * - Learning (easeFactor any, repetitions 1-2): 25% contribution
 * - Familiar (easeFactor >= 2.0, repetitions 3-4): 50% contribution
 * - Proficient (easeFactor >= 2.3, repetitions >= 5): 75% contribution
 * - Mastered (easeFactor >= 2.5, repetitions >= 5, interval >= 21): 100% contribution
 * 
 * Overall deck mastery = average of all lexeme contributions
 */
function calculateDeckMastery(lexemes: any[]): {
    masteryPercent: number;
    masteryBreakdown: { new: number; learning: number; familiar: number; proficient: number; mastered: number };
} {
    if (lexemes.length === 0) {
        return { masteryPercent: 0, masteryBreakdown: { new: 0, learning: 0, familiar: 0, proficient: 0, mastered: 0 } };
    }

    let totalContribution = 0;
    const breakdown = { new: 0, learning: 0, familiar: 0, proficient: 0, mastered: 0 };

    for (const lexeme of lexemes) {
        const ef = lexeme.easeFactor ?? 2.5;
        const reps = lexeme.repetitions ?? 0;
        const interval = lexeme.interval ?? 0;

        if (reps === 0) {
            breakdown.new++;
            totalContribution += 0;
        } else if (reps <= 2) {
            breakdown.learning++;
            totalContribution += 25;
        } else if (reps <= 4 || ef < 2.3) {
            breakdown.familiar++;
            totalContribution += 50;
        } else if (interval < 21 || ef < 2.5) {
            breakdown.proficient++;
            totalContribution += 75;
        } else {
            breakdown.mastered++;
            totalContribution += 100;
        }
    }

    const masteryPercent = Math.round(totalContribution / lexemes.length);

    return { masteryPercent, masteryBreakdown: breakdown };
}


// ========== ROUTES ==========

// Get user progress profile
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;

        let progress = await UserProgress.findOne({ userId: user.uid });

        if (!progress) {
            // Create fresh progress for new user
            progress = new UserProgress({ userId: user.uid });
            await progress.save();
        }

        const currentMilestone = MILESTONES.find(m => m.level === progress!.level) || MILESTONES[0];
        const nextMilestone = MILESTONES.find(m => m.level === progress!.level + 1) || null;

        res.json({
            totalXP: progress.totalXP,
            level: progress.level,
            currentMilestone,
            nextMilestone,
            xpToNextLevel: nextMilestone ? nextMilestone.xpRequired - progress.totalXP : 0,
            totalSessionsCompleted: progress.totalSessionsCompleted,
            totalCardsStudied: progress.totalCardsStudied,
            currentStreak: progress.currentStreak,
            longestStreak: progress.longestStreak,
            recentSessions: progress.sessionHistory.slice(-10).reverse(),
            milestones: MILESTONES
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Complete a study session - award XP
router.post('/complete-session', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const body = req.body as {
            deckId: string;
            deckTitle: string;
            cardsStudied: number;
            ratings: number[];
        };

        if (!body.deckId || !body.cardsStudied || !body.ratings?.length) {
            res.status(400).json({ error: 'Missing required fields: deckId, cardsStudied, ratings' });
            return;
        }

        const avgRating = body.ratings.reduce((a, b) => a + b, 0) / body.ratings.length;
        const now = new Date();

        let progress = await UserProgress.findOne({ userId: user.uid });
        if (!progress) {
            progress = new UserProgress({ userId: user.uid });
        }

        // Calculate streak
        const isConsecutive = isConsecutiveDay(progress.lastStudiedDate, now);
        const isSame = isSameDay(progress.lastStudiedDate, now);

        if (isConsecutive) {
            progress.currentStreak += 1;
        } else if (!isSame) {
            progress.currentStreak = 1; // Reset streak (but count today)
        }
        // If same day, don't change streak

        if (progress.currentStreak > progress.longestStreak) {
            progress.longestStreak = progress.currentStreak;
        }

        // Calculate XP
        const xpEarned = calculateSessionXP(body.cardsStudied, avgRating, isConsecutive);

        // Update progress
        progress.totalXP += xpEarned;
        progress.level = calculateLevel(progress.totalXP);
        progress.totalSessionsCompleted += 1;
        progress.totalCardsStudied += body.cardsStudied;
        progress.lastStudiedDate = now;

        // Add session record (keep last 50)
        progress.sessionHistory.push({
            deckId: body.deckId,
            deckTitle: body.deckTitle,
            cardsStudied: body.cardsStudied,
            avgRating: Math.round(avgRating * 10) / 10,
            xpEarned,
            completedAt: now
        });

        if (progress.sessionHistory.length > 50) {
            progress.sessionHistory = progress.sessionHistory.slice(-50);
        }

        await progress.save();

        const currentMilestone = MILESTONES.find(m => m.level === progress!.level) || MILESTONES[0];
        const nextMilestone = MILESTONES.find(m => m.level === progress!.level + 1) || null;
        const previousLevel = calculateLevel(progress.totalXP - xpEarned);
        const leveledUp = progress.level > previousLevel;

        res.json({
            xpEarned,
            totalXP: progress.totalXP,
            level: progress.level,
            currentMilestone,
            nextMilestone,
            xpToNextLevel: nextMilestone ? nextMilestone.xpRequired - progress.totalXP : 0,
            leveledUp,
            currentStreak: progress.currentStreak,
            longestStreak: progress.longestStreak
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/deck/:deckId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const deckId = req.params.deckId;

        const deck = await Deck.findById(deckId);
        if (!deck) {
            res.status(404).json({ error: 'Deck not found' });
            return;
        }

        // Only owner can see their own progress
        if (deck.userId !== user.uid) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const { masteryPercent, masteryBreakdown } = calculateDeckMastery(deck.lexemes);

        res.json({
            deckId,
            masteryPercent,
            masteryBreakdown,
            totalLexemes: deck.lexemes.length
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/my-decks', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;

        const decks = await Deck.find({ userId: user.uid });

        const deckProgress = decks.map(deck => {
            const { masteryPercent, masteryBreakdown } = calculateDeckMastery(deck.lexemes);
            return {
                deckId: deck._id.toString(),
                masteryPercent,
                masteryBreakdown,
                totalLexemes: deck.lexemes.length
            };
        });

        res.json(deckProgress);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get milestones list
router.get('/milestones', async (_req: AuthRequest, res: Response) => {
    res.json(MILESTONES);
});

export default router;