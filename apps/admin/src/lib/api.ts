import { Project, Document } from "@knowledge-widget/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface DashboardProject extends Project {
  documents: Document[];
}

export async function getProjects(): Promise<DashboardProject[]> {
  const res = await fetch(`${API_URL}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(name: string): Promise<DashboardProject> {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function getProjectDetails(id: string): Promise<DashboardProject> {
  const res = await fetch(`${API_URL}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project details");
  return res.json();
}

export async function updateProjectSettings(
  id: string,
  settings: {
    name: string;
    systemPrompt: string;
    similarityThreshold: number;
    maxSources: number;
    fallbackMessage: string;
    customApiKey?: string | null;
    customModel?: string | null;
  }
): Promise<DashboardProject> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update project settings");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
}

export async function uploadDocument(projectId: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("file", file);

  const res = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to upload document");
  }
  return res.json();
}

export async function pasteDocument(
  projectId: string,
  title: string,
  content: string
): Promise<Document> {
  const res = await fetch(`${API_URL}/documents/paste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, title, content }),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to save text source");
  }
  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}
