/**
 * AI Assistant Service for ROOM
 * Connects to server-side Gemini API endpoints
 */

export interface SummarizeMeetingParams {
  roomName: string;
  notes: string;
  messages: any[];
  participants: any[];
  projectContext?: any;
}

export class AiService {
  async generateMeetingSummary(params: SummarizeMeetingParams): Promise<string> {
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Summary API responded with status ${res.status}`);
      }

      const data = await res.json();
      return data.summary;
    } catch (err: any) {
      console.warn('AI summary fetch failed:', err.message);
      const lines = (params.notes || '').split('\n').filter((l: string) => l.trim().length > 0);
      return lines.length > 0
        ? `### Meeting Summary\n${lines.slice(0, 5).join('\n')}`
        : `### Meeting Summary\nNo notes or chat records were captured for this room.`;
    }
  }

  async askAi(question: string, roomContext: any): Promise<string> {
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, roomContext }),
      });

      if (!res.ok) {
        throw new Error(`AI Ask API responded with ${res.status}`);
      }

      const data = await res.json();
      return data.answer;
    } catch (err: any) {
      console.warn('AI query error:', err.message);
      return `ROOM Assistant: I am ready to assist with your meeting notes or room discussions.`;
    }
  }
}

export const aiService = new AiService();
