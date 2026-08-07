import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Voice Deconstruction AI endpoint
  app.post('/api/deconstruct-voice', async (req, res) => {
    try {
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Transcript string is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });
          const prompt = `You are Weave AI, an expert ADHD productivity assistant that breaks down overwhelming thoughts into ultra-low-friction micro-tasks.
Given the following raw spoken brain dump, extract 1 to 4 clean actionable tasks. For each task, break it down into 2 to 4 micro-steps (each micro-step taking under 3 minutes to start).

Spoken Brain Dump: "${transcript}"

Return ONLY a valid JSON array matching this exact format:
[
  {
    "title": "Clean & organize desk",
    "category": "personal", // 'work' | 'personal' | 'health' | 'creative' | 'quick'
    "timeEstimateMinutes": 10,
    "microSteps": [
      { "title": "Throw away 3 pieces of trash", "completed": false },
      { "title": "Put pens back in mug", "completed": false }
    ]
  }
]`;

          const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-3.1-pro-preview'];
          let rawText: string | undefined;

          for (const modelName of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                },
              });
              rawText = response.text;
              if (rawText) break;
            } catch (err) {
              console.warn(`Model ${modelName} failed, trying next fallback model:`, err);
            }
          }

          if (rawText) {
            const parsed = JSON.parse(rawText);
            return res.json({ tasks: parsed });
          }
        } catch (geminiError) {
          console.warn('Gemini API call failed, falling back to heuristic AI:', geminiError);
        }
      }

      // Smart Fallback Deconstruction if API key missing or error
      const sentences = transcript
        .split(/(?:\.|\n| and then | then | also | plus )+/gi)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);

      const items = sentences.length > 0 ? sentences : [transcript];

      const fallbackTasks = items.slice(0, 4).map((item, idx) => {
        const cleanTitle = item.charAt(0).toUpperCase() + item.slice(1);
        return {
          title: cleanTitle,
          category: idx % 2 === 0 ? 'work' : 'personal',
          timeEstimateMinutes: Math.min(15, Math.max(5, cleanTitle.length * 2)),
          microSteps: [
            { id: `fb-${idx}-1`, title: `Step 1: Get materials for ${cleanTitle.toLowerCase().slice(0, 20)}`, completed: false },
            { id: `fb-${idx}-2`, title: 'Step 2: Do 2 minutes of focused effort', completed: false },
            { id: `fb-${idx}-3`, title: 'Step 3: Review & check off final detail', completed: false },
          ],
        };
      });

      return res.json({ tasks: fallbackTasks });
    } catch (err: any) {
      console.error('Error in /api/deconstruct-voice:', err);
      return res.status(500).json({ error: 'Failed to process voice deconstruction' });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Weave App running on http://localhost:${PORT}`);
  });
}

startServer();
