import { db, projects, documents, chunks, conversations, messages } from "./index";
import { sql, eq, and } from "drizzle-orm";
import { GeminiProvider } from "@knowledge-widget/ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function run() {
  console.log("Starting test-chat-query...");
  
  // 1. Get a project
  const projs = await db.select().from(projects).limit(1);
  if (projs.length === 0) {
    console.log("❌ No projects found in database.");
    process.exit(0);
  }
  const projectConfig = projs[0];
  console.log(`Using project: ${projectConfig.id} (${projectConfig.name})`);

  // 2. Initialize AI
  const aiProvider = new GeminiProvider();
  const query = "Is the clinic open on Sunday?";
  console.log(`Generating embedding for query: "${query}"...`);
  const queryEmbedding = await aiProvider.generateEmbedding(query);
  console.log("✅ Query embedding generated successfully!");

  // 3. Query chunks
  const vectorString = `[${queryEmbedding.join(",")}]`;
  const similarity = sql<number>`1 - (${chunks.embedding} <=> ${vectorString}::vector)`;
  
  console.log("Querying chunks table...");
  try {
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
          eq(documents.projectId, projectConfig.id),
          sql`(${chunks.embedding} <=> ${vectorString}::vector) < ${1 - projectConfig.similarityThreshold}`
        )
      )
      .orderBy(sql`${chunks.embedding} <=> ${vectorString}::vector`)
      .limit(projectConfig.maxSources);

    console.log(`✅ Success! Matched chunks: ${matchedChunks.length}`);
    for (const chunk of matchedChunks) {
      console.log(`- Snippet: "${chunk.chunkText.substring(0, 50)}", similarity: ${chunk.similarity}`);
    }
  } catch (err: any) {
    console.error("❌ Failed query chunks:", err.message || err);
    console.error(err);
  }

  // 4. Test insert conversation and message
  console.log("Testing insert conversation and message...");
  try {
    const newConv = await db.insert(conversations).values({
      projectId: projectConfig.id
    }).returning();
    const finalConversationId = newConv[0].id;
    console.log(`✅ Conversation created: ${finalConversationId}`);

    await db.insert(messages).values({
      conversationId: finalConversationId,
      role: "user",
      content: query
    });
    console.log("✅ User message inserted successfully!");
  } catch (err: any) {
    console.error("❌ Failed database insert:", err.message || err);
    console.error(err);
  }

  process.exit(0);
}

run();
