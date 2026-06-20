import type { SelectChatMessage } from '~/db/schemas';

export const buildChatSystemPrompt = (
  unitTitle: string,
  rawText: string,
): string => `
You are a helpful teaching assistant for a course unit called "${unitTitle}".
Your role is to help students understand the course material.

IMPORTANT RULES:
1. Only answer questions directly related to the course content provided below.
2. If a question is NOT related to the course content, politely decline to answer.
3. Be concise but thorough in your explanations.
4. Use examples from the course material when helpful.
5. Always be respectful and encouraging.

Course Content (use this as your knowledge base):
${rawText}

When the user asks a question:
- If it's related to the course content above, answer based on that content.
- If it's not related to the course content, politely say something like:
  "I'm here to help with questions about this course unit. Is there something specific from the material you'd like to ask?"
`;

export const buildChatUserPrompt = (
  userMessage: string,
  chatHistory: SelectChatMessage[],
): string => {
  const historyContext = chatHistory
    .map(
      (msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
    )
    .join('\n');

  return `
${historyContext ? `Conversation history:\n${historyContext}\n\n` : ''}User's new question: ${userMessage}

Please provide a helpful response based on the course content. If the question is not related to the course content, politely decline.
`;
};

export const parseChatResponse = (text: string): string => {
  const cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    return cleaned
      .replace(/```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }
  return cleaned;
};

export const isRelatedToCourse = (
  userMessage: string,
  rawText: string,
): boolean => {
  const keywords = rawText.slice(0, 1000).split(/\s+/).filter(Boolean);
  const userWords = userMessage.toLowerCase().split(/\s+/);

  const matches = keywords.filter((k) =>
    userWords.some(
      (w) => w.includes(k.toLowerCase()) || k.toLowerCase().includes(w),
    ),
  );

  return matches.length >= 2;
};
