import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
}

export interface GeneratedQuizQuestion {
  question_text: string;
  options: {
    option_text: string;
    is_correct: boolean;
  }[];
  explanation?: string;
}

export class AIService {
  private ai: GoogleGenAI | null = null;
  private modelName = "gemini-2.5-flash";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
        console.log(`[AI] Initialized Gemini AI service with model: ${this.modelName}`);
      } catch (error) {
        console.warn("[AI] Failed to initialize Gemini client:", error);
      }
    } else {
      console.log("[AI] No GEMINI_API_KEY detected. AI service will operate in offline heuristic mode.");
    }
  }

  public isAvailable(): boolean {
    return this.ai !== null;
  }

  /**
   * Generates a role-aware conversational response using Gemini 2.5 Flash
   */
  async chatWithAgent(
    role: "student" | "faculty" | "admin",
    prompt: string,
    history: ChatMessage[] = [],
    context?: string,
  ): Promise<string> {
    if (!this.ai) {
      return this.getOfflineRoleFallback(role, prompt);
    }

    const systemInstruction = this.getRoleSystemInstruction(role, context);

    // Format conversation history for Gemini
    const contents: any[] = [];
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.sender === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return response.text || "I was unable to generate a response at this moment.";
    } catch (error: any) {
      console.error("[AI] Error generating chat response:", error);
      return `I encountered an error connecting to the AI engine (${error?.message || "unknown"}). Here is a platform guide:\n${this.getOfflineRoleFallback(role, prompt)}`;
    }
  }

  /**
   * Generates structured quiz MCQs from a lecture topic or provided text excerpt
   */
  async generateQuiz(
    topic: string,
    questionCount: number = 5,
    difficulty: "Easy" | "Medium" | "Hard" = "Medium",
    courseMaterial?: string,
  ): Promise<GeneratedQuizQuestion[]> {
    if (!this.ai) {
      return this.getMockGeneratedQuestions(topic, questionCount);
    }

    const promptText = `
You are an expert university professor creating an academic quiz for students.
Create exactly ${questionCount} multiple choice questions (MCQs) on the topic: "${topic}".
Difficulty Level: ${difficulty}.
${courseMaterial ? `Reference Study Material:\n"""${courseMaterial.slice(0, 3000)}"""\n` : ""}

For each question:
- Provide 4 distinct options.
- Exactly 1 option MUST have is_correct: true, and the other 3 MUST have is_correct: false.
- Include a concise 1-2 sentence explanation of why the correct answer is right.

Return ONLY a valid JSON array adhering strictly to this schema:
[
  {
    "question_text": "Question text here?",
    "options": [
      { "option_text": "Option A text", "is_correct": false },
      { "option_text": "Option B text", "is_correct": true },
      { "option_text": "Option C text", "is_correct": false },
      { "option_text": "Option D text", "is_correct": false }
    ],
    "explanation": "Explanation here."
  }
]
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const responseText = response.text || "[]";
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      throw new Error("Invalid format returned by AI model");
    } catch (error) {
      console.error("[AI] Error generating quiz questions:", error);
      return this.getMockGeneratedQuestions(topic, questionCount);
    }
  }

  /**
   * Analyzes student code and error output to provide pedagogical hints without direct spoilers
   */
  async explainCodeError(
    code: string,
    language: string,
    errorOutput: string,
    problemDescription?: string,
  ): Promise<string> {
    if (!this.ai) {
      return `Review your ${language} logic near the reported line in the error: "${errorOutput}". Ensure correct syntax and edge cases.`;
    }

    const promptText = `
You are a friendly Socratic coding tutor assisting a computer science student.
Language: ${language}
${problemDescription ? `Problem Description: ${problemDescription}\n` : ""}
Student's Code:
\`\`\`${language}
${code}
\`\`\`

Execution Output / Error:
"""
${errorOutput}
"""

Instructions:
1. Explain what the error means in plain, encouraging English.
2. Point out the likely logical or syntactic cause in their code.
3. CRITICAL: DO NOT give them the complete fixed code solution. Guide them with a hint so they learn by fixing it themselves.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: promptText,
        config: {
          temperature: 0.4,
        },
      });
      return response.text || "Could not generate guidance.";
    } catch (error) {
      console.error("[AI] Code explanation failed:", error);
      return `Notice the error message: ${errorOutput}. Check variable initializations, loop bounds, and return types.`;
    }
  }

  private getRoleSystemInstruction(role: string, context?: string): string {
    switch (role) {
      case "student":
        return `You are EduHub AI Tutor, a knowledgeable, friendly, and pedagogical mentor for engineering and university students.
- Explain concepts clearly with simple examples.
- When students ask for help with homework or programming exercises, use the Socratic method: explain the underlying computer science principles and provide hints rather than writing entire solutions for them.
- Guide them through using EduHub (finding study notes, submitting assignments, taking tests, and reviewing attendance).
${context ? `Current Context: ${context}` : ""}`;

      case "faculty":
        return `You are EduHub Faculty Assistant, an AI partner designed for university professors and lecturers.
- Help faculty write clear assignment prompts, format test questions, construct evaluation rubrics, and structure lecture outlines.
- Provide advice on assessing student performance, identifying struggling students, and organizing curriculum topics.
${context ? `Current Context: ${context}` : ""}`;

      case "admin":
      default:
        return `You are EduHub Institutional Advisor, assisting academic administrators, deans, and department heads.
- Provide guidance on curriculum scheduling, batch allocations, exam anti-cheat configurations, and institutional compliance (e.g. NAAC, NBA, ABET).
- Maintain an executive, organized, and analytical tone.
${context ? `Current Context: ${context}` : ""}`;
    }
  }

  private getOfflineRoleFallback(role: string, prompt: string): string {
    const p = prompt.toLowerCase();
    if (role === "student") {
      if (p.includes("assignment") || p.includes("submit")) {
        return "To submit an assignment: Go to Student Portal > Assignments > Click on the active assignment > Attach your document or write your submission > Click Submit.";
      }
      if (p.includes("test") || p.includes("coding")) {
        return "To take a coding test: Go to Student Portal > Coding Tests > Click 'Start Test'. Note: Full-screen mode is required and tab switches are logged by the anti-cheat system.";
      }
      return "I am EduHub AI Tutor. In offline mode, I can guide you through using the portal for your assignments, timetable, notes, and tests.";
    }

    if (role === "faculty") {
      if (p.includes("quiz") || p.includes("question")) {
        return "To create a quiz: Go to Faculty Portal > Create Quiz > Enter title, duration, and add multiple choice questions with correct answer designations.";
      }
      return "I am EduHub Faculty Assistant. I can assist you with managing quizzes, assignments, lecture notes, and student attendance.";
    }

    return "I am EduHub Platform Assistant. You can manage departments, students, faculty, and academic timetables through the Admin portal.";
  }

  private getMockGeneratedQuestions(topic: string, count: number): GeneratedQuizQuestion[] {
    const list: GeneratedQuizQuestion[] = [];
    for (let i = 1; i <= count; i++) {
      list.push({
        question_text: `What is a primary characteristic or fundamental concept of ${topic} (Concept ${i})?`,
        options: [
          { option_text: `It enables deterministic and efficient processing of ${topic}`, is_correct: true },
          { option_text: `It requires unbounded hardware resources without optimization`, is_correct: false },
          { option_text: `It is completely deprecated in modern software engineering`, is_correct: false },
          { option_text: `It only operates within interpreted languages`, is_correct: false },
        ],
        explanation: `This option correctly represents the core architectural principle behind ${topic}.`,
      });
    }
    return list;
  }
}

export const aiService = new AIService();
export default aiService;
