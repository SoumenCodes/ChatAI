import pdf from "pdf-parse";

/**
 * Extracts raw text from a document buffer based on file extension.
 * Supports PDF and TXT files.
 */
export async function extractText(buffer: Buffer, fileExtension: string): Promise<string> {
  const ext = fileExtension.toLowerCase().replace(/^\./, "");
  
  if (ext === "pdf") {
    const data = await pdf(buffer);
    return data.text || "";
  } else if (ext === "txt") {
    return buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: .${ext}. Only PDF and TXT files are supported.`);
  }
}

/**
 * Splits text into overlapping chunks of characters.
 * Ensures we do not break words mid-sentence by grouping on spaces/words.
 */
export function chunkText(text: string, chunkSize = 500, chunkOverlap = 100): string[] {
  if (!text || text.trim().length === 0) return [];
  if (chunkSize <= 0) throw new Error("chunkSize must be greater than 0");
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be 0 or greater, and strictly less than chunkSize");
  }

  // Clean double spaces and line-break noise to normalize text structure
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  const chunks: string[] = [];
  
  let currentWords: string[] = [];
  let currentLength = 0;
  let wordIndex = 0;

  while (wordIndex < words.length) {
    const word = words[wordIndex];
    // Length including the space we will append
    const addedLength = currentLength === 0 ? word.length : word.length + 1;

    if (currentLength + addedLength <= chunkSize || currentWords.length === 0) {
      currentWords.push(word);
      currentLength += addedLength;
      wordIndex++;
    } else {
      // Save current chunk
      chunks.push(currentWords.join(" "));
      
      // Calculate overlap: step back word by word until overlap characters are covered
      let overlapWords: string[] = [];
      let overlapLength = 0;
      let stepBack = 1;
      
      while (
        wordIndex - stepBack >= 0 && 
        overlapLength + words[wordIndex - stepBack].length + (overlapLength === 0 ? 0 : 1) <= chunkOverlap
      ) {
        const backWord = words[wordIndex - stepBack];
        overlapWords.unshift(backWord);
        overlapLength += overlapLength === 0 ? backWord.length : backWord.length + 1;
        stepBack++;
      }

      currentWords = [...overlapWords];
      currentLength = overlapLength;
    }
  }

  // Add the last trailing chunk
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }

  return chunks;
}

/**
 * Computes cosine similarity between two numerical vectors of equal dimensions.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimension to calculate cosine similarity.");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0; // Avoid division by zero
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
