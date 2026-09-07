import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { signalingServer } from './server/signaling';
import { roomManager } from './server/rooms';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check and system status
app.get('/api/health', (req, res) => {
  const signalingStats = signalingServer.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ROOM by Armen GlobalWorks Backend',
    signaling: {
      status: 'active',
      path: '/ws',
      activeRooms: signalingStats.activeRooms,
      totalConnections: signalingStats.totalConnections
    },
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Signaling status endpoint
app.get('/api/signaling/status', (req, res) => {
  res.json({
    status: 'ok',
    ...signalingServer.getStats()
  });
});

// Room creation endpoint
app.post('/api/rooms', (req, res) => {
  const { id, name, hostId, hostName } = req.body || {};
  const room = roomManager.createRoom({
    id,
    name,
    hostId: hostId || 'host-user',
    hostName: hostName || 'Room Host',
  });
  const participants = roomManager.getParticipants(room.id);
  res.json({
    success: true,
    room: {
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      hostId: room.hostId,
      hostName: room.hostName,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      isLocked: room.isLocked,
      permissions: room.permissions,
    },
    participants,
    totalParticipants: participants.length,
    shareableUrl: `/join/${room.id}`,
  });
});

// Room validation & lookup endpoint
app.get('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const result = roomManager.validateRoom(roomId);
  if (!result.valid || !result.room) {
    return res.status(404).json({
      success: false,
      reason: result.reason || 'Room not found'
    });
  }
  const participants = roomManager.getParticipants(result.room.id);
  res.json({
    success: true,
    room: {
      id: result.room.id,
      roomCode: result.room.roomCode,
      name: result.room.name,
      hostId: result.room.hostId,
      hostName: result.room.hostName,
      createdAt: result.room.createdAt,
      expiresAt: result.room.expiresAt,
      isLocked: result.room.isLocked,
      permissions: result.room.permissions,
    },
    participants,
    totalParticipants: participants.length,
  });
});

// Room join verification endpoint (Join existing room strictly)
app.post('/api/rooms/:id/join', (req, res) => {
  const roomId = req.params.id;
  const { userId, sessionId, name } = req.body || {};
  const result = roomManager.validateRoom(roomId);
  if (!result.valid || !result.room) {
    return res.status(404).json({
      success: false,
      reason: result.reason || 'Room not found'
    });
  }

  // Determine role: ONLY host if userId matches hostId
  const isHost = Boolean(userId && result.room.hostId && result.room.hostId === userId);
  const assignedRole = isHost ? 'host' : 'guest';
  const participants = roomManager.getParticipants(result.room.id);

  res.json({
    success: true,
    room: {
      id: result.room.id,
      roomCode: result.room.roomCode,
      name: result.room.name,
      hostId: result.room.hostId,
      hostName: result.room.hostName,
      createdAt: result.room.createdAt,
      expiresAt: result.room.expiresAt,
      isLocked: result.room.isLocked,
      permissions: result.room.permissions,
    },
    assignedRole,
    participants,
    totalParticipants: participants.length,
  });
});

// Lazy Google GenAI initialization
let genaiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genaiClient;
}

// AI Meeting Summarization & Insights endpoint
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { roomName, notes, messages, participants } = req.body;

    const transcriptSample = (messages || [])
      .map((m: any) => `${m.senderName || 'Participant'} (${m.timestamp || ''}): ${m.content || ''}`)
      .join('\n');

    const hasContent = Boolean(notes?.trim() || transcriptSample.trim());

    if (!hasContent) {
      return res.json({
        success: true,
        summary: `### Summary\nNo notes or chat messages were recorded during this session.`,
        generatedAt: new Date().toISOString(),
        model: 'system'
      });
    }

    const prompt = `You are the meeting assistant for ROOM.
Analyze this meeting session based strictly on the provided notes and transcript:
Room: ${roomName || 'Room'}
Participants: ${(participants || []).map((p: any) => p.name || p).join(', ') || 'None listed'}

Meeting Notes:
${notes || 'None'}

Meeting Chat Log:
${transcriptSample || 'None'}

Generate a clear, neutral summary with:
1. Executive Summary
2. Key Decisions
3. Action Items (assigned owners if mentioned)
4. Open Inquiries

Respond in clean, modern Markdown. Do not invent facts, people, or companies not present in the source notes or transcript.`;

    const ai = getGenAI();
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        success: true,
        summary: response.text || 'Unable to generate summary.',
        generatedAt: new Date().toISOString(),
        model: 'gemini-3.8-flash'
      });
    }

    // Dynamic rule-based summary without any fictional placeholders
    const lines = (notes || '').split('\n').filter((l: string) => l.trim().length > 0);
    const summaryLines = lines.length > 0 ? lines.slice(0, 5).join('\n') : 'Meeting concluded.';

    return res.json({
      success: true,
      summary: `### Summary\n${summaryLines}\n\n### Participants\n${(participants || []).map((p: any) => p.name || p).join(', ') || 'None listed'}`,
      generatedAt: new Date().toISOString(),
      model: 'system-rule-summary'
    });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate summary' });
  }
});

// AI Q&A Assistant endpoint
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { question, roomContext } = req.body;
    const ai = getGenAI();

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the ROOM meeting assistant.
Context: ${JSON.stringify(roomContext || {})}
Question: ${question}

Provide a helpful, neutral, and professional response. Do not invent fictional companies or people.`,
      });

      return res.json({
        answer: response.text || 'No response generated.'
      });
    }

    return res.json({
      answer: `I am your ROOM meeting assistant. How can I assist you with your current room or notes?`
    });
  } catch (error: any) {
    console.error('Error in AI assistant query:', error);
    res.status(500).json({ error: error?.message || 'Query failed' });
  }
});

// AI Intelligent Extraction for ROOM Keep
// Analyzes meeting transcript/notes/chat and extracts high-signal Ideas, Decisions, Tasks, References, Questions
app.post('/api/ai/extract-keep', async (req, res) => {
  try {
    const { text, notes, messages, roomTitle, participants } = req.body;

    const chatContent = (messages || [])
      .map((m: any) => `${m.senderName || 'Participant'}: ${m.content || m.text || ''}`)
      .join('\n');

    const sourceNotes = notes || '';
    const sourceChat = chatContent || text || '';

    if (!sourceNotes.trim() && !sourceChat.trim()) {
      return res.json({
        success: true,
        suggestions: [],
        model: 'empty-source'
      });
    }

    const combinedSource = `
Room: ${roomTitle || 'Room Session'}
Participants: ${(participants || []).map((p: any) => p.name || p).join(', ') || 'None'}

Notes:
${sourceNotes || 'None recorded'}

Chat & Transcript:
${sourceChat || 'None recorded'}
`.trim();

    const ai = getGenAI();
    if (ai) {
      const prompt = `You are ROOM Keep Intelligence.
Analyze the provided meeting dialogue, notes, and chat.
Identify high-signal, meaningful items actually discussed or decided. STRICT RULE: Do NOT invent facts or fictional people.

Extract items into these categories:
1. 'idea': Creative concepts or suggestions discussed
2. 'decision': Concrete agreements or choices confirmed
3. 'task': Actionable commitments with an owner if named
4. 'reference': Links, books, specs, or tools referenced
5. 'question': Unresolved questions requiring follow-up

Return ONLY a valid JSON array of objects with the following structure:
[
  {
    "category": "idea" | "decision" | "task" | "reference" | "question",
    "title": "Short title",
    "content": "Description based on actual source text",
    "assignedTo": "Name of assignee if named, or null",
    "dueDate": "Due date if mentioned, or null",
    "confidence": 0.95
  }
]

Source content to analyze:
${combinedSource}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '[]';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          success: true,
          suggestions: Array.isArray(parsed) ? parsed : [],
          model: 'gemini-3.8-flash'
        });
      } catch (parseErr) {
        console.warn('Failed to parse Gemini JSON output for keep extraction:', parseErr);
      }
    }

    // Dynamic extraction from actual notes if Gemini is not configured
    const realSuggestions: any[] = [];
    const noteLines = sourceNotes.split('\n').map((l: string) => l.trim()).filter(Boolean);
    for (const line of noteLines) {
      if (line.toLowerCase().startsWith('- [ ]') || line.toLowerCase().includes('todo') || line.toLowerCase().includes('task:')) {
        const cleanText = line.replace(/^-\s*\[\s*\]\s*/, '').replace(/^(todo|task):\s*/i, '');
        realSuggestions.push({
          category: 'task',
          title: cleanText.substring(0, 40),
          content: cleanText,
          assignedTo: null,
          dueDate: null,
          confidence: 0.9,
        });
      } else if (line.toLowerCase().includes('decision:') || line.toLowerCase().includes('agreed:')) {
        const cleanText = line.replace(/^(decision|agreed):\s*/i, '');
        realSuggestions.push({
          category: 'decision',
          title: cleanText.substring(0, 40),
          content: cleanText,
          assignedTo: null,
          dueDate: null,
          confidence: 0.9,
        });
      }
    }

    return res.json({
      success: true,
      suggestions: realSuggestions,
      model: 'source-based-extraction'
    });
  } catch (error: any) {
    console.error('Error in AI keep extraction:', error);
    res.status(500).json({ error: error?.message || 'Extraction failed' });
  }
});

// AI Classify single Keep item from Chat or Note
app.post('/api/ai/classify-keep', async (req, res) => {
  try {
    const { text, context } = req.body;
    const ai = getGenAI();

    if (ai && text) {
      const prompt = `Analyze this statement from a team discussion:
"${text}"
Context: ${context || 'ROOM Communication'}

Categorize it into ONE of: 'idea', 'decision', 'task', 'reference', 'question'.
Return a JSON object:
{
  "category": "idea" | "decision" | "task" | "reference" | "question",
  "title": "Clean, punchy title (max 7 words)",
  "content": "Refined summary of the item",
  "assignedTo": "Person name or null"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      try {
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, item: parsed });
      } catch (e) {}
    }

    // Heuristic categorization fallback
    const lower = (text || '').toLowerCase();
    let category: 'idea' | 'decision' | 'task' | 'reference' | 'question' = 'idea';
    if (lower.includes('decide') || lower.includes('agreed') || lower.includes('approved') || lower.includes('will be') || lower.includes('locked')) {
      category = 'decision';
    } else if (lower.includes('todo') || lower.includes('rewrite') || lower.includes('send') || lower.includes('fix') || lower.includes('need to') || lower.includes('by tomorrow')) {
      category = 'task';
    } else if (lower.includes('?') || lower.includes('how') || lower.includes('what') || lower.includes('do we have') || lower.includes('can we')) {
      category = 'question';
    } else if (lower.includes('http') || lower.includes('link') || lower.includes('spec') || lower.includes('doc') || lower.includes('drive')) {
      category = 'reference';
    }

    res.json({
      success: true,
      item: {
        category,
        title: text.length > 50 ? text.substring(0, 47) + '...' : text,
        content: text,
        assignedTo: null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Classification failed' });
  }
});

// AI Unified Search Across Everything (Chat, Meetings, Keep, Projects)
app.post('/api/ai/unified-search', async (req, res) => {
  try {
    const { query, keepItems, chatMessages, meetingRecords } = req.body;
    const ai = getGenAI();

    if (!query || !query.trim()) {
      return res.json({ synthesis: '', matches: [] });
    }

    if (ai) {
      const summaryContext = `
Keep Items:
${(keepItems || []).map((k: any) => `[${k.category.toUpperCase()}] ${k.title}: ${k.content} (Source: ${k.source?.title || 'General'})`).join('\n')}

Meeting Records:
${(meetingRecords || []).map((m: any) => `[MEETING] ${m.roomTitle} (${m.date}): ${m.summary || m.notes || ''}`).join('\n')}

Chat Logs:
${(chatMessages || []).slice(0, 40).map((c: any) => `[CHAT] ${c.senderName}: ${c.content}`).join('\n')}
`;

      const prompt = `You are the central search engine for ROOM by Armen GlobalWorks.
User Query: "${query}"

Synthesize an immediate, direct, and factual answer in 1-3 sentences based on the team's records above.
Specify the exact source (e.g. "The team decided during the September 6 Project Discussion...").
If the query is a direct search, provide clear synthesis with citation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        success: true,
        synthesis: response.text || '',
        query,
      });
    }

    // Default synthesis
    res.json({
      success: true,
      synthesis: `Records indicate relevant discussions regarding "${query}" in recent project sessions. Review the matching Keep items and meeting archives below for exact details.`,
      query,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Search failed' });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  // Initialize WebRTC WebSocket signaling server on the HTTP server
  signalingServer.init(httpServer);

  // Vite dev middleware vs production static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ROOM Server with WebRTC Signaling running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
