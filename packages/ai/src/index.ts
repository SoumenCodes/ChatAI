import { GoogleGenAI } from "@google/genai";

export interface AIProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateTextStream(
    prompt: string,
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      // model: "gemini-flash-latest",
     model: "gemini-flash-latest",
      contents: prompt,
      config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
    });
    return response.text || "";
  }

  async generateTextStream(
    prompt: string,
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const responseStream = await this.ai.models.generateContentStream({
      // model: "gemini-flash-latest",
     model: "gemini-flash-latest",
      contents: prompt,
      config: { systemInstruction: systemPrompt },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const textChunk = chunk.text || "";
      fullText += textChunk;
      onChunk(textChunk);
    }
    return fullText;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: {
        outputDimensionality: 768
      }
    });
    
    const embedding = response.embeddings?.[0];
    if (!embedding?.values) {
      throw new Error("Failed to generate embedding: values are missing from response");
    }
    
    return embedding.values;
  }
}
