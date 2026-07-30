import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { sql, eq, and } from "drizzle-orm";
import { 
  db, 
  projects, 
  documents, 
  chunks, 
  conversations, 
  messages 
} from "@knowledge-widget/database";
import { GeminiProvider } from "@knowledge-widget/ai";
import { extractText, chunkText } from "@knowledge-widget/rag";

// Load environment variables from the root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const port = process.env.PORT || 3001;

// Initialize Gemini Client
let aiProvider: GeminiProvider;
try {
  aiProvider = new GeminiProvider();
} catch (err: any) {
  console.warn("⚠️ Warning: AI Provider failed to initialize. Check GEMINI_API_KEY in .env");
}

// Config middlewares
app.use(cors({ origin: "*" })); // Enabled globally for widget embedding
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "../../widget/dist")));

// Setup Multer for memory storage file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// 1. PROJECTS ROUTE ENDPOINTS
// ==========================================

// Create Project
app.post("/projects", async (req, res) => {
  const { name, systemPrompt, similarityThreshold, maxSources, fallbackMessage } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }

  // Generate unique URL friendly ID
  const baseId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const projectId = `${baseId}-${rand}`;

  try {
    const newProject = await db.insert(projects).values({
      id: projectId,
      name,
      systemPrompt: systemPrompt || undefined,
      similarityThreshold: similarityThreshold !== undefined ? Number(similarityThreshold) : undefined,
      maxSources: maxSources !== undefined ? Number(maxSources) : undefined,
      fallbackMessage: fallbackMessage || undefined,
    }).returning();

    res.status(201).json(newProject[0]);
  } catch (err: any) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Get Projects List
app.get("/projects", async (req, res) => {
  try {
    // Return projects joined with counts of documents
    const projectsList = await db.select().from(projects).orderBy(sql`${projects.createdAt} desc`);
    
    // Fetch document counts for each project
    const results = await Promise.all(projectsList.map(async (proj) => {
      const docs = await db.select().from(documents).where(eq(documents.projectId, proj.id));
      const docsWithCount = await Promise.all(docs.map(async (doc) => {
        const chunkList = await db.select({ id: chunks.id }).from(chunks).where(eq(chunks.documentId, doc.id));
        return {
          ...doc,
          chunksCount: chunkList.length
        };
      }));
      return {
        ...proj,
        documents: docsWithCount
      };
    }));

    res.json(results);
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Delete Project
app.delete("/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(projects).where(eq(projects.id, id));
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Get Project Details (Including Settings & Allowed domains mockup)
app.get("/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const proj = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (proj.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const docs = await db.select().from(documents).where(eq(documents.projectId, id));
    const docsWithCount = await Promise.all(docs.map(async (doc) => {
      const chunkList = await db.select({ id: chunks.id }).from(chunks).where(eq(chunks.documentId, doc.id));
      return {
        ...doc,
        chunksCount: chunkList.length
      };
    }));
    res.json({
      ...proj[0],
      documents: docsWithCount
    });
  } catch (err: any) {
    console.error("Error fetching project details:", err);
    res.status(500).json({ error: "Failed to fetch project details" });
  }
});

// Update Project Settings
app.put("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, systemPrompt, similarityThreshold, maxSources, fallbackMessage } = req.body;
  try {
    const updated = await db.update(projects).set({
      name,
      systemPrompt,
      similarityThreshold: similarityThreshold !== undefined ? Number(similarityThreshold) : undefined,
      maxSources: maxSources !== undefined ? Number(maxSources) : undefined,
      fallbackMessage
    }).where(eq(projects.id, id)).returning();

    res.json(updated[0]);
  } catch (err: any) {
    console.error("Error updating project settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ==========================================
// 2. DOCUMENT MANAGEMENT ENDPOINTS
// ==========================================

// Upload & Process Document File (PDF / TXT)
app.post("/documents/upload", upload.single("file"), async (req, res) => {
  const { projectId } = req.body;
  const file = req.file;

  if (!projectId || !file) {
    return res.status(400).json({ error: "ProjectId and File are required" });
  }

  if (!aiProvider) {
    return res.status(503).json({ error: "AI Provider is not configured (missing Gemini API Key)" });
  }

  // Create temporary document record
  const docId = crypto.randomUUID();
  const fileName = file.originalname;
  
  try {
    // 1. Verify project exists
    const proj = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (proj.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 2. Write document record as processing
    await db.insert(documents).values({
      id: docId,
      projectId,
      fileName,
      filePath: `/uploads/${docId}-${fileName.toLowerCase().replace(/[^a-z0-9.]/g, "-")}`,
      status: "processing"
    });

    // 3. Extract text from buffer
    const extension = path.extname(fileName);
    const textContent = await extractText(file.buffer, extension);

    if (!textContent || textContent.trim().length === 0) {
      throw new Error("No readable text found in document.");
    }

    // 4. Chunk text (500 size, 100 overlap)
    const textChunks = chunkText(textContent, 500, 100);

    if (textChunks.length === 0) {
      throw new Error("Document text chunking generated 0 blocks.");
    }

    // 5. Generate embeddings and save to database
    // We execute sequentially or in small batches to avoid rate limit locks
    for (const chunkItem of textChunks) {
      const embedding = await aiProvider.generateEmbedding(chunkItem);
      
      await db.insert(chunks).values({
        documentId: docId,
        chunkText: chunkItem,
        embedding: embedding
      });
    }

    // 6. Update document status to processed
    const processedDoc = await db.update(documents).set({
      status: "processed"
    }).where(eq(documents.id, docId)).returning();

    res.status(201).json(processedDoc[0]);
  } catch (err: any) {
    console.error("Error processing document:", err);
    // Set status to failed
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, docId));
    res.status(500).json({ error: err.message || "Failed to process document" });
  }
});

// Paste Direct Text Knowledge Source
app.post("/documents/paste", async (req, res) => {
  const { projectId, title, content } = req.body;

  if (!projectId || !title || !content) {
    return res.status(400).json({ error: "ProjectId, title, and content are required" });
  }

  if (!aiProvider) {
    return res.status(503).json({ error: "AI Provider is not configured (missing Gemini API Key)" });
  }

  const docId = crypto.randomUUID();
  const fileName = `${title}.txt`;

  try {
    const proj = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (proj.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    await db.insert(documents).values({
      id: docId,
      projectId,
      fileName,
      filePath: `/pasted/${docId}-${title.toLowerCase().replace(/[^a-z0-9.]/g, "-")}.txt`,
      status: "processing"
    });

    const textChunks = chunkText(content, 500, 100);

    for (const chunkItem of textChunks) {
      const embedding = await aiProvider.generateEmbedding(chunkItem);
      
      await db.insert(chunks).values({
        documentId: docId,
        chunkText: chunkItem,
        embedding: embedding
      });
    }

    const processedDoc = await db.update(documents).set({
      status: "processed"
    }).where(eq(documents.id, docId)).returning();

    res.status(201).json(processedDoc[0]);
  } catch (err: any) {
    console.error("Error processing pasted text:", err);
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, docId));
    res.status(500).json({ error: err.message || "Failed to save text" });
  }
});

// Delete Document
app.delete("/documents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(documents).where(eq(documents.id, id));
    res.json({ success: true, message: "Document deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting document:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ==========================================
// 3. RAG SEARCH & SSE STREAMING CHAT
// ==========================================

app.post("/chat", async (req, res) => {
  const { projectId, conversationId, message } = req.body;

  if (!projectId || !message) {
    return res.status(400).json({ error: "ProjectId and message are required" });
  }

  if (!aiProvider) {
    return res.status(503).json({ error: "AI Provider is not configured (missing Gemini API Key)" });
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // 1. Fetch Project Config
    const projList = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (projList.length === 0) {
      res.write(`data: ${JSON.stringify({ error: "Project not found" })}\n\n`);
      return res.end();
    }
    const projectConfig = projList[0];

    // 2. Generate Query Embedding
    const queryEmbedding = await aiProvider.generateEmbedding(message);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // 3. Query pgvector matching chunks (Cosine Distance operator: <=>)
    // Cosine similarity = 1 - Cosine Distance
    const threshold = projectConfig.similarityThreshold;
    const maxSources = projectConfig.maxSources;

    const similarity = sql<number>`1 - (${chunks.embedding} <=> ${vectorString}::vector)`;

    const matchedChunks = await db
      .select({
        id: chunks.id,
        chunkText: chunks.chunkText,
        fileName: documents.fileName,
        documentId: documents.id,
        similarity: similarity,
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(
        and(
          eq(documents.projectId, projectId),
          sql`(${chunks.embedding} <=> ${vectorString}::vector) < ${1 - threshold}`
        )
      )
      .orderBy(sql`${chunks.embedding} <=> ${vectorString}::vector`)
      .limit(maxSources);

    // 4. Retrieve or Create Conversation
    let finalConversationId = conversationId;
    if (!finalConversationId) {
      const newConv = await db.insert(conversations).values({
        projectId
      }).returning();
      finalConversationId = newConv[0].id;
    }

    // Save user message logs
    await db.insert(messages).values({
      conversationId: finalConversationId,
      role: "user",
      content: message
    });

    // Intercept common greetings to reply instantly without running RAG
    const cleanMsg = message.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "yo"];
    if (greetings.includes(cleanMsg)) {
      const greetingReply = `Hi! How can I help you today?`;
      const words = greetingReply.split(" ");
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ text: word + " " })}\n\n`);
        await new Promise((r) => setTimeout(r, 60));
      }
      
      await db.insert(messages).values({
        conversationId: finalConversationId,
        role: "assistant",
        content: greetingReply
      });

      res.write(`data: ${JSON.stringify({ done: true, conversationId: finalConversationId, sources: [] })}\n\n`);
      return res.end();
    }

    // 5. Handle fallback if similarity threshold not met
    if (matchedChunks.length === 0) {
      const fallback = projectConfig.fallbackMessage;
      
      // Stream fallback word by word to emulate real-time AI generation
      const words = fallback.split(" ");
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ text: word + " " })}\n\n`);
        await new Promise((r) => setTimeout(r, 60)); // typing effect delay
      }
      
      // Log assistant message (without sources)
      await db.insert(messages).values({
        conversationId: finalConversationId,
        role: "assistant",
        content: fallback
      });

      res.write(`data: ${JSON.stringify({ done: true, conversationId: finalConversationId, sources: [] })}\n\n`);
      return res.end();
    }

    // 6. Build prompt context using matched chunks
    const contextText = matchedChunks
      .map((c, i) => `[Source ${i + 1}]: ${c.fileName}\nContent: ${c.chunkText}`)
      .join("\n\n---\n\n");

    const systemPromptInstruction = projectConfig.systemPrompt;
    
    const userPrompt = `Document Context:\n---\n${contextText}\n---\n\nUser Question: ${message}\n\nAnswer the user question based only on the document context provided above. Be extremely concise. If the answer cannot be found in the context, say "${projectConfig.fallbackMessage}". Do not cite links that are not in the context.`;

    // 7. Stream content from Gemini
    let fullResponse = "";
    await aiProvider.generateTextStream(
      userPrompt,
      systemPromptInstruction,
      (textChunk) => {
        fullResponse += textChunk;
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    );

    // 8. Compile Sources Citation
    const uniqueSources = Array.from(
      new Map(matchedChunks.map((item) => [item.documentId, item])).values()
    ).map((c) => ({
      documentId: c.documentId,
      fileName: c.fileName,
      textSnippet: c.chunkText.substring(0, 150) + "..."
    }));

    // Save assistant message logs with citations
    await db.insert(messages).values({
      conversationId: finalConversationId,
      role: "assistant",
      content: fullResponse,
      sources: uniqueSources
    });

    // Send closing SSE signal
    res.write(`data: ${JSON.stringify({ 
      done: true, 
      conversationId: finalConversationId, 
      sources: uniqueSources 
    })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error("Error in chat endpoint:", err);
    res.write(`data: ${JSON.stringify({ error: "Unable to generate a response." })}\n\n`);
    res.end();
  }
});

// Boot API server
app.listen(port, () => {
  console.log(`🚀 Express API server listening on http://localhost:${port}`);
});
