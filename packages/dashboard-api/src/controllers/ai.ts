import { Response } from 'express';
import crypto from 'crypto';
import { apiResponse } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatWithAI(req: AuthenticatedRequest, res: Response) {
  try {
    const { messages, conversationId } = (req.body || {}) as {
      messages?: ChatMessage[];
      conversationId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json(new apiResponse(400, 'messages is required'));
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const convId = conversationId || crypto.randomUUID();

    if (!apiKey) {
      return res.status(200).json(new apiResponse(200, 'AI not configured', {
        success: false,
        response: 'AI is not configured on the server yet.',
        conversationId: convId,
      }));
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(502).json(new apiResponse(502, 'Upstream AI error', {
        success: false,
        response: 'Sorry, the AI service is temporarily unavailable.',
        conversationId: convId,
      }, errText));
    }

    const data: any = await response.json();
    const content: string = data?.choices?.[0]?.message?.content || '';

    return res.status(200).json(new apiResponse(200, 'AI response', {
      success: true,
      response: content,
      conversationId: convId,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}
