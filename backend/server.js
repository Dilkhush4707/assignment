import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.URL, // your frontend deploy URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// 🔑 Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 📝 Route 1 — Summarize
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, prompt } = req.body;
    console.log("Received transcript:", transcript);
    console.log("Received prompt:", prompt);

    // ⚡ Use flash model (cheaper, higher quota)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `You are an expert analyst. Read the transcript below and generate a **clean, structured, human-like summary**. Do **not** include introductory phrases like "This transcript provides...".  

Instructions:  
1. Extract main topics as **headings**.  
2. Under each heading, give:  
   - **Short definition or explanation** (1–2 sentences max).  
   - **Concise bullet points** highlighting actionable or important details.  
3. Keep language natural, like explaining to a colleague.  
4. Skip any unnecessary filler.  
5. Make it skimmable and clear.

Transcript:  
${transcript}

User instruction / focus:  
${prompt}

`
    );

    const summary = result.response.text();
    res.json({ summary });
  } catch (err) {
    console.error("❌ Summarization Error:", err);

    if (err.status === 429) {
      return res.status(429).json({
        error: "Rate limit reached. Please wait a bit before retrying.",
      });
    }

    res.status(500).json({ error: "AI summarization failed." });
  }
});

// 📧 Route 2 — Send Email
app.post("/api/email", async (req, res) => {
  try {
    const { summary, email } = req.body;

    let transporter = nodemailer.createTransport({
      service: "gmail", // you can change this to outlook/yahoo/etc
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Meeting Summary",
      text: summary,
    });

    res.json({ message: "✅ Email sent!" });
  } catch (err) {
    console.error("❌ Email Error:", err);
    res.status(500).json({ error: "Email sending failed." });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
