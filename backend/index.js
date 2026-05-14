const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const lengthMap = {
  short: "1 to 2 sentences",
  medium: "3 to 4 sentences",
  detailed: "5 to 7 sentences",
};

// Health check
app.get("/", (req, res) => res.json({ status: "ok" }));

// Expand single bullet
app.post("/expand", async (req, res) => {
  const { bullet, tone = "Professional", length = "medium" } = req.body;

  if (!bullet || !bullet.trim()) {
    return res.status(400).json({ error: "Bullet point is required." });
  }

  const sentenceLength = lengthMap[length] || lengthMap.medium;

  const systemPrompt = `You are an expert writing assistant that expands bullet points into well-written paragraphs.
Tone: ${tone}
Length: exactly ${sentenceLength}
Rules:
- Write ONLY the expanded paragraph. No preamble, no labels, no extra explanation.
- Match the specified tone precisely.
- Add context, examples, and depth to the bullet point's core idea.`;

  try {
    // Stream response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Expand this bullet point:\n• ${bullet.trim()}` },
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
});

// Expand all bullets at once (non-streaming batch)
app.post("/expand-all", async (req, res) => {
  const { bullets, tone = "Professional", length = "medium" } = req.body;

  if (!bullets || !Array.isArray(bullets) || bullets.length === 0) {
    return res.status(400).json({ error: "Bullets array is required." });
  }

  const sentenceLength = lengthMap[length] || lengthMap.medium;

  const systemPrompt = `You are an expert writing assistant. Expand each bullet point into a well-written paragraph.
Tone: ${tone}
Length per paragraph: ${sentenceLength}
Rules:
- Return ONLY a JSON array of strings, one expanded paragraph per bullet.
- No extra explanation, no preamble. Just the JSON array.
- Example output: ["Expanded paragraph 1.", "Expanded paragraph 2."]`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Expand each of these bullets:\n${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json({ results: parsed });
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(500).json({ error: err.message || "Batch expansion failed." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
