import { z } from 'zod'
import { router, publicProcedure } from '@/lib/trpc'
import { geminiRouter } from './gemini'

export const appRouter = router({
  // Gemini AI integration
  gemini: geminiRouter,
  // Example: Get user profile
  getUserProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      // This would typically fetch from your database
      return {
        id: input.userId,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
      }
    }),

  // Example: Update user profile
  updateUserProfile: publicProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(({ input }) => {
      // This would typically update your database
      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: input.userId,
          name: input.name || 'John Doe',
          email: input.email || 'john@example.com',
        }
      }
    }),

  // Example: Get chat messages
  getChatMessages: publicProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(({ input }) => {
      // Mock chat messages - replace with real database query
      const messages = Array.from({ length: input.limit }, (_, i) => ({
        id: `msg-${i}`,
        content: `This is message ${i + 1}`,
        type: i % 3 === 0 ? 'user' : i % 3 === 1 ? 'ai' : 'gemini-text' as const,
        timestamp: new Date(Date.now() - i * 60000),
        metadata: i % 3 === 2 ? {
          model: 'gemini-pro',
          tokens: 150,
          isStreaming: false,
        } : undefined,
      }))

      return {
        messages,
        nextCursor: `cursor-${input.limit}`,
      }
    }),

  // Example: Send chat message
  sendMessage: publicProcedure
    .input(z.object({
      content: z.string().min(1),
      type: z.enum(['user', 'ai', 'gemini-text', 'gemini-image']).default('user'),
      metadata: z.object({
        model: z.string().optional(),
        tokens: z.number().optional(),
        imageUrl: z.string().optional(),
        isStreaming: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(({ input }) => {
      // This would typically save to database and trigger AI response
      return {
        id: `msg-${Date.now()}`,
        content: input.content,
        type: input.type,
        timestamp: new Date(),
        metadata: input.metadata,
      }
    }),
})

export type AppRouter = typeof appRouter