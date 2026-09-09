import express, { Request, Response } from "express";
import aiService from "../services/AIService";
import { authenticateToken } from "../middlewares/auth";

const router = express.Router();

// Check AI Service availability
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    available: aiService.isAvailable(),
    model: "gemini-2.5-flash",
  });
});

// Chat with role-aware AI Tutor / Assistant
router.post("/chat", authenticateToken, async (req: any, res: Response) => {
  try {
    const { prompt, history, context } = req.body;
    const userRole = (req.user?.role || "student").toLowerCase();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const responseText = await aiService.chatWithAgent(
      userRole,
      prompt.trim(),
      Array.isArray(history) ? history : [],
      context,
    );

    return res.json({
      success: true,
      role: userRole,
      response: responseText,
    });
  } catch (error: any) {
    console.error("[AI Route] Chat error:", error);
    return res.status(500).json({
      error: "Failed to generate AI response",
      details: error?.message,
    });
  }
});

// Faculty-only endpoint to generate structured quiz questions
router.post("/generate-quiz", authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = (req.user?.role || "").toLowerCase();
    if (userRole !== "faculty" && userRole !== "admin") {
      return res.status(403).json({ error: "Access denied. Faculty or Admin only." });
    }

    const { topic, questionCount = 5, difficulty = "Medium", courseMaterial } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required." });
    }

    const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20);

    const questions = await aiService.generateQuiz(
      topic.trim(),
      count,
      difficulty,
      courseMaterial,
    );

    return res.json({
      success: true,
      topic,
      difficulty,
      questions,
    });
  } catch (error: any) {
    console.error("[AI Route] Quiz generation error:", error);
    return res.status(500).json({
      error: "Failed to generate quiz questions",
      details: error?.message,
    });
  }
});

// Coding test assistance - explains errors without giving direct solution
router.post("/explain-code", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code, language, errorOutput, problemDescription } = req.body;

    if (!code || !errorOutput) {
      return res.status(400).json({ error: "Code and errorOutput are required." });
    }

    const explanation = await aiService.explainCodeError(
      code,
      language || "python",
      errorOutput,
      problemDescription,
    );

    return res.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error("[AI Route] Code explanation error:", error);
    return res.status(500).json({
      error: "Failed to generate code explanation",
      details: error?.message,
    });
  }
});

export default router;
