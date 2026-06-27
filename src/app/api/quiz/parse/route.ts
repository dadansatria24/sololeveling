import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

import type { Schema } from "@google/generative-ai";

const quizSchema: Schema = {
  type: SchemaType.ARRAY,
  description: "A list of multiple-choice quiz questions",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: {
        type: SchemaType.STRING,
        description: "The question text",
      },
      options: {
        type: SchemaType.ARRAY,
        description: "Array of 4 answer options",
        items: { type: SchemaType.STRING },
      },
      correctIndex: {
        type: SchemaType.NUMBER,
        description: "Zero-based index of the correct answer in the options array",
      },
    },
    required: ["question", "options", "correctIndex"],
  },
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide text with at least 10 characters" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 0.3,
      },
    });

    const prompt = `You are a quiz generator. Parse the following text into multiple-choice quiz questions.

Rules:
- Each question must have exactly 4 options
- correctIndex is the 0-based index of the correct answer
- If the text already contains questions and answers, extract them faithfully
- If the text is a topic or passage, generate relevant quiz questions from it
- Questions should be clear and educational
- Generate between 3 and 20 questions depending on the content length
- All content should be in the same language as the input text

Input text:
${text}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const questions = JSON.parse(responseText);

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "AI could not generate questions from this text. Try providing clearer content." },
        { status: 422 }
      );
    }

    // Validate each question
    const validated = questions
      .filter(
        (q: { question?: string; options?: string[]; correctIndex?: number }) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length
      )
      .map((q: { question: string; options: string[]; correctIndex: number }, i: number) => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctIndex: q.correctIndex,
        sort_order: i,
      }));

    if (validated.length === 0) {
      return NextResponse.json(
        { error: "AI generated malformed questions. Try rephrasing your input." },
        { status: 422 }
      );
    }

    return NextResponse.json({ questions: validated });
  } catch (error) {
    console.error("Quiz parse error:", error);
    return NextResponse.json(
      { error: `AI processing failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
