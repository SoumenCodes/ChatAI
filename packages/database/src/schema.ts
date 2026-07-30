import { pgTable, uuid, text, integer, doublePrecision, timestamp, jsonb, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Custom type helper for pgvector support
export const vector = customType<{
  data: number[];
  config: { dimensions: number };
}>({
  dataType: (config) => `vector(${config?.dimensions})`,
  toDriver: (value: number[]) => `[${value.join(",")}]`,
  fromDriver: (value: unknown) => {
    if (typeof value !== "string") return [];
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  },
});

// PROJECTS TABLE
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt")
    .notNull()
    .default("You are a helpful AI assistant. Answer only using the provided document context. If you do not know the answer based on the context, say that you do not know."),
  similarityThreshold: doublePrecision("similarity_threshold").notNull().default(0.45),
  maxSources: integer("max_sources").notNull().default(3),
  fallbackMessage: text("fallback_message")
    .notNull()
    .default("This question does not belong to My Work"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// DOCUMENTS TABLE
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  status: text("status", { enum: ["processing", "processed", "failed"] })
    .notNull()
    .default("processing"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CHUNKS TABLE
export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(), // Gemini text-embedding-004 has 768 dimensions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CONVERSATIONS TABLE
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// MESSAGES TABLE
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources"), // JSON array storing citations
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// RELATION DEFINITIONS FOR DRIZZLE
export const projectsRelations = relations(projects, ({ many }) => ({
  documents: many(documents),
  conversations: many(conversations),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
