// api/tts.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode || req.headers["x-access-code"] !== accessCode) {
    res.status(401).json({ error: "Invalid or missing access code." });
    return;
  }

  const { text, voice } = req.body || {};
  if (!text) {
    res.status(400).json({ error: "Missing 'text' in request body." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY on server." });
    return;
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice || "nova",
        response_format: "mp3"
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI TTS error:", errText);
      res
        .status(openaiRes.status)
        .json({ error: "OpenAI TTS request failed." });
      return;
    }

    const arrayBuffer = await openaiRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("Server error in /api/tts:", err);
    res.status(500).json({ error: "Server error." });
  }
}

