import { Router } from 'express';
import type { Response } from 'express';
import { ConversationSession } from '../models/ConversationSession.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Create a new conversation session (save initial state)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const { language, difficulty, topic, context, firstMessage, firstMessageTranslation } = req.body;

        if (!language || !difficulty || !topic || !context || !firstMessage) {
            res.status(400).json({ error: 'Missing required fields: language, difficulty, topic, context, firstMessage' });
            return;
        }

        const session = new ConversationSession({
            userId: user.uid,
            language,
            difficulty,
            topic,
            context,
            messages: [{
                role: 'ai',
                content: firstMessage,
                translation: firstMessageTranslation,
                timestamp: new Date()
            }],
            status: 'active'
        });

        await session.save();
        res.status(201).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's conversation sessions
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const limit = parseInt(req.query.limit as string || '20');
        const status = req.query.status as string;

        const query: any = { userId: user.uid };
        if (status) {
            query.status = status;
        }

        const sessions = await ConversationSession.find(query)
            .sort({ updatedAt: -1 })
            .limit(limit)
            .select('-messages'); // Don't send full messages in list

        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific conversation session
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const session = await ConversationSession.findOne({
            _id: req.params.id,
            userId: user.uid
        });

        if (!session) {
            res.status(404).json({ error: 'Conversation session not found' });
            return;
        }

        res.json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add a message to a conversation session
router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const { role, content, translation } = req.body;

        if (!role || !content) {
            res.status(400).json({ error: 'Missing required fields: role, content' });
            return;
        }

        const session = await ConversationSession.findOne({
            _id: req.params.id,
            userId: user.uid,
            status: 'active'
        });

        if (!session) {
            res.status(404).json({ error: 'Active conversation session not found' });
            return;
        }

        session.messages.push({
            role,
            content,
            translation,
            timestamp: new Date()
        });

        await session.save();
        res.json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Complete a conversation session (save feedback)
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const { feedback } = req.body;

        const session = await ConversationSession.findOne({
            _id: req.params.id,
            userId: user.uid
        });

        if (!session) {
            res.status(404).json({ error: 'Conversation session not found' });
            return;
        }

        session.status = 'completed';
        if (feedback) {
            session.feedback = feedback;
        }

        await session.save();
        res.json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a conversation session
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const result = await ConversationSession.findOneAndDelete({
            _id: req.params.id,
            userId: user.uid
        });

        if (!result) {
            res.status(404).json({ error: 'Conversation session not found' });
            return;
        }

        res.json({ message: 'Conversation session deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
