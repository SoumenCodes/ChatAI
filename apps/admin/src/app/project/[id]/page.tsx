"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  getProjectDetails, 
  updateProjectSettings, 
  deleteProject, 
  uploadDocument, 
  pasteDocument, 
  deleteDocument, 
  DashboardProject 
} from "@/lib/api";
import { Document as SharedDocument } from "@knowledge-widget/shared";
import { 
  ArrowLeft, 
  Code, 
  Trash2, 
  Upload, 
  Globe, 
  FileText, 
  Check, 
  Copy, 
  Plus, 
  Bot, 
  User, 
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Save,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const [project, setProject] = useState<DashboardProject | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Form states for settings
  const [systemPrompt, setSystemPrompt] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.45);
  const [maxSources, setMaxSources] = useState(3);
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("gemini-flash-latest");
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Widget preview states
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string, sources?: string[]}>>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Utility states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Load project on mount
  useEffect(() => {
    getProjectDetails(id)
      .then((data) => {
        setProject(data);
        setSystemPrompt(data.systemPrompt);
        setFallbackMessage(data.fallbackMessage);
        setSimilarityThreshold(data.similarityThreshold);
        setMaxSources(data.maxSources);
        setCustomApiKey(data.customApiKey || "");
        setCustomModel(data.customModel || "gemini-flash-latest");
        setAllowedDomains(["http://localhost:3000"]); // Mock domain list

        // Initial welcome message
        setMessages([
          { role: "assistant", content: `Hi 👋 I'm the AI assistant for ${data.name}. How can I help you today?` }
        ]);
      })
      .catch((err) => {
        console.error("Failed to load project details:", err);
        router.push("/");
      });
  }, [id, router]);

  // Scroll chat preview to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Settings handlers
  const handleSaveSettings = () => {
    updateProjectSettings(id, {
      name: project.name,
      systemPrompt,
      fallbackMessage,
      similarityThreshold,
      maxSources,
      customApiKey: customApiKey.trim() || null,
      customModel: customModel || null
    })
      .then((data) => {
        setProject(data);
        alert("Settings saved successfully!");
      })
      .catch((err) => {
        alert("Failed to save settings");
        console.error(err);
      });
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    if (!allowedDomains.includes(newDomain.trim())) {
      setAllowedDomains([...allowedDomains, newDomain.trim()]);
    }
    setNewDomain("");
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  // Upload / Process Document Handlers
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsProcessing(true);
    uploadDocument(id, uploadFile)
      .then((newDoc) => {
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: [...(prev.documents || []), newDoc]
          };
        });
        setUploadFile(null);
        setIsProcessing(false);
      })
      .catch((err) => {
        alert(err.message || "Upload failed. Please try again.");
        setIsProcessing(false);
      });
  };

  const handlePasteText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim() || !pasteContent.trim()) return;

    setIsProcessing(true);
    pasteDocument(id, pasteTitle.trim(), pasteContent.trim())
      .then((newDoc) => {
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: [...(prev.documents || []), newDoc]
          };
        });
        setPasteTitle("");
        setPasteContent("");
        setIsProcessing(false);
      })
      .catch((err) => {
        alert(err.message || "Failed to save text");
        setIsProcessing(false);
      });
  };

  const handleDeleteDocument = (docId: string) => {
    if (!confirm("Are you sure you want to delete this document? All its text chunks and embeddings will be removed.")) return;
    deleteDocument(docId)
      .then(() => {
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: prev.documents.filter((d) => d.id !== docId)
          };
        });
      })
      .catch((err) => {
        alert("Failed to delete document");
        console.error(err);
      });
  };

  const handleDeleteProject = () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete this project and all its uploaded documents. This action cannot be undone. Are you sure?")) return;
    deleteProject(id)
      .then(() => {
        router.push("/");
      })
      .catch((err) => {
        alert("Failed to delete project");
        console.error(err);
      });
  };

  // Live chat widget preview (Server-Sent Events streaming)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const userMsg = userInput.trim();
    setUserInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    let streamedResponse = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          conversationId,
          message: userMsg
        })
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader on response body");

      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) throw new Error(parsed.error);

              if (parsed.text) {
                streamedResponse += parsed.text;
                setMessages(prev => {
                  const copy = [...prev];
                  const lastIdx = copy.length - 1;
                  copy[lastIdx] = {
                    role: "assistant",
                    content: streamedResponse
                  };
                  return copy;
                });
              }

              if (parsed.done) {
                if (parsed.conversationId) {
                  setConversationId(parsed.conversationId);
                }
                setMessages(prev => {
                  const copy = [...prev];
                  const lastIdx = copy.length - 1;
                  copy[lastIdx] = {
                    role: "assistant",
                    content: streamedResponse,
                    sources: (parsed.sources || []).map((s: any) => s.fileName)
                  };
                  return copy;
                });
                setIsTyping(false);
              }
            } catch (err) {
              console.warn("Failed to parse chunk:", jsonStr, err);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error in preview chat:", error);
      setIsTyping(false);
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        copy[lastIdx] = {
          role: "assistant",
          content: "Unable to generate a response. Please verify the API server is running on http://localhost:3001"
        };
        return copy;
      });
    }
  };

  // Script snippet
  const embedCode = `<script src="http://localhost:3001/widget.js"></script>\n<script>\n  AIWidget.init({\n    projectId: "${project.id}"\n  });\n</script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-indigo-600 flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Projects
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">{project.name}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Delete Project Button */}
            <Button 
              variant="ghost" 
              onClick={handleDeleteProject}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 gap-1.5 font-semibold text-xs h-9"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
              Delete Project
            </Button>
          </div>
        </header>

        {/* Dynamic content wrapper */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Project Details Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-tight font-heading">{project.name}</h2>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Active
                  </span>
                </div>
                <p className="text-slate-500 text-xs font-mono mt-1">Project ID: {project.id}</p>
              </div>

              {/* Action items */}
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-medium text-sm gap-2">
                      <Code className="h-4 w-4 text-slate-600" />
                      Get Widget Code
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Embed Chat Widget</DialogTitle>
                      <DialogDescription>
                        Copy this JavaScript snippet and paste it right before the closing <code className="text-indigo-600">&lt;/body&gt;</code> tag on your website.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 relative">
                      <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">
                        {embedCode}
                      </pre>
                      <Button 
                        size="sm" 
                        onClick={copyEmbedCode} 
                        className="absolute right-3 top-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 gap-1.5 text-xs"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Config Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-slate-100/80 p-1 border border-slate-200/60 rounded-lg">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-semibold text-sm">
                  Overview & Documents
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-semibold text-sm">
                  Chat Settings
                </TabsTrigger>
                <TabsTrigger value="installation" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-semibold text-sm">
                  Installation
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                
                {/* Statistics Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Documents</div>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1 font-heading">{project.documents?.length || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">PDF, TXT, DOCX</div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Chunks</div>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1 font-heading">
                        {project.documents?.reduce((acc, curr) => acc + (curr.chunksCount || 0), 0) || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">Processed Chunks</div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Queries</div>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1 font-heading">2,531</div>
                      <div className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-0.5">
                        Active Widget
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">No Answer Fallbacks</div>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1 font-heading">3.2%</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">Below similarity limit</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  
                  {/* Left columns: Documents upload and Table list */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Add Data Source Cards */}
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold text-slate-800">Add Data Sources</CardTitle>
                        <CardDescription>Feed information into your chatbot widget's knowledge brain.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          
                          {/* File Upload Form */}
                          <form onSubmit={handleFileUpload} className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <Label className="text-slate-700 font-semibold text-xs">Upload Document File (PDF / TXT)</Label>
                              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400 transition-colors duration-200 relative cursor-pointer min-h-[140px]">
                                <input
                                  type="file"
                                  accept=".pdf,.txt"
                                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  disabled={isProcessing}
                                />
                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                {uploadFile ? (
                                  <div className="text-center">
                                    <span className="text-xs font-semibold text-indigo-600 block truncate max-w-[180px]">{uploadFile.name}</span>
                                    <span className="text-[10px] text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <span className="text-xs text-slate-600 font-medium block">Click to browse files</span>
                                    <span className="text-[10px] text-slate-400">PDF, TXT up to 10MB</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button 
                              type="submit" 
                              disabled={!uploadFile || isProcessing}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow gap-2"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Processing Vector Embeddings...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" /> Process & Embed File
                                </>
                              )}
                            </Button>
                          </form>

                          {/* Raw text Paste Form */}
                          <form onSubmit={handlePasteText} className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="pasteTitle" className="text-slate-700 font-semibold text-xs">Paste Direct Text Content</Label>
                              <Input 
                                id="pasteTitle" 
                                value={pasteTitle}
                                onChange={(e) => setPasteTitle(e.target.value)}
                                placeholder="Source title, e.g. Contact Info"
                                className="focus-visible:ring-indigo-600 h-9"
                                disabled={isProcessing}
                              />
                              <Textarea 
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                                placeholder="Paste FAQs or raw knowledge here..."
                                className="min-h-[92px] focus-visible:ring-indigo-600 text-xs"
                                disabled={isProcessing}
                              />
                            </div>
                            <Button 
                              type="submit"
                              disabled={!pasteTitle.trim() || !pasteContent.trim() || isProcessing}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow gap-2"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Embedding Chunks...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" /> Save & Build Embeddings
                                </>
                              )}
                            </Button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Document List Table */}
                    <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-base font-bold text-slate-800">Uploaded Documents</CardTitle>
                        <CardDescription>Current list of processed documents answering visitors queries.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {project.documents?.length > 0 ? (
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-slate-500 font-semibold text-xs pl-6">Name</TableHead>
                                <TableHead className="text-slate-500 font-semibold text-xs">Type</TableHead>
                                <TableHead className="text-slate-500 font-semibold text-xs">Chunks</TableHead>
                                <TableHead className="text-slate-500 font-semibold text-xs">Uploaded At</TableHead>
                                <TableHead className="text-slate-500 font-semibold text-xs">Status</TableHead>
                                <TableHead className="text-slate-500 font-semibold text-xs pr-6 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {project.documents.map((doc) => {
                                const ext = doc.fileName.split(".").pop()?.toUpperCase() || "TXT";
                                return (
                                  <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-semibold text-slate-800 text-xs pl-6 max-w-[200px] truncate">
                                      {doc.fileName}
                                    </TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                                        ext === "PDF" 
                                          ? "bg-red-50 text-red-700 ring-red-600/10" 
                                          : "bg-blue-50 text-blue-700 ring-blue-600/10"
                                      }`}>
                                        {ext}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-slate-600 text-xs font-semibold">{doc.chunksCount}</TableCell>
                                    <TableCell className="text-slate-500 text-xs">
                                      {new Date(doc.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                        Processed
                                      </span>
                                    </TableCell>
                                    <TableCell className="pr-6 text-right">
                                      <button 
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white">
                            <FileText className="h-10 w-10 text-slate-200 mb-3" />
                            <p className="text-xs">No documents uploaded yet. Upload a PDF or paste text above.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </div>

                  {/* Right column: Interactive Widget Preview Mockup */}
                  <div className="space-y-6">
                    <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden h-[540px] flex flex-col">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                          <span className="text-xs font-bold text-slate-800">Widget Live Preview</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                          Local Sandbox
                        </span>
                      </div>

                      {/* Mock Chat View */}
                      <div className="flex-1 flex flex-col justify-between bg-slate-50 overflow-hidden">
                        
                        {/* Chat Messages */}
                        <div className="flex-grow p-4 overflow-y-auto space-y-3 scrollbar-thin">
                          {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                              <div className={`flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 text-xs font-semibold ${
                                msg.role === 'user' 
                                  ? 'bg-slate-800 text-white' 
                                  : 'bg-indigo-600 text-white'
                              }`}>
                                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                              </div>
                              <div className="space-y-1">
                                <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm border ${
                                  msg.role === 'user'
                                    ? 'bg-slate-800 text-white border-slate-700'
                                    : 'bg-white text-slate-800 border-slate-100'
                                }`}>
                                  {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="text-[9px] text-slate-400 px-1 font-semibold flex items-center gap-1">
                                    Source: <span className="underline italic text-indigo-500">{msg.sources.join(", ")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Typing indicator */}
                          {isTyping && (
                            <div className="flex gap-2.5 max-w-[80%] mr-auto">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white flex-shrink-0">
                                <Bot className="h-3.5 w-3.5" />
                              </div>
                              <div className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-400 shadow-sm flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Quick Suggestions */}
                        <div className="px-4 py-1.5 bg-slate-50 flex gap-2 overflow-x-auto flex-shrink-0 select-none no-scrollbar">
                          <button 
                            onClick={() => setUserInput("What is the visiting hour?")}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-sm transition-all"
                          >
                            Visiting Hours
                          </button>
                          <button 
                            onClick={() => setUserInput("Do I need an appointment?")}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-sm transition-all"
                          >
                            Appointments
                          </button>
                          <button 
                            onClick={() => setUserInput("Who is Rohan Mehta?")}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-sm transition-all"
                          >
                            Dr. Rohan Mehta
                          </button>
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
                          <Input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="text-xs h-9 focus-visible:ring-indigo-600 flex-1 bg-slate-50/50"
                            disabled={isTyping}
                          />
                          <Button 
                            type="submit" 
                            size="icon" 
                            disabled={!userInput.trim() || isTyping}
                            className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>

                      </div>
                    </Card>
                  </div>

                </div>
              </TabsContent>

              {/* SETTINGS TAB */}
              <TabsContent value="settings">
                <div className="grid gap-6 lg:grid-cols-3">
                  
                  {/* Settings fields */}
                  <div className="lg:col-span-2">
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold text-slate-800">Chat Settings</CardTitle>
                        <CardDescription>Adjust how the AI widget behaves and answers user queries.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        
                        {/* System Prompt */}
                        <div className="space-y-2">
                          <Label htmlFor="systemPrompt" className="text-slate-800 font-bold text-xs">System Prompt</Label>
                          <p className="text-[11px] text-slate-400">Instruct the AI on who it is, how it should speak, and how strictly it should adhere to documents.</p>
                          <Textarea
                            id="systemPrompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="min-h-[120px] focus-visible:ring-indigo-600 text-xs"
                          />
                        </div>

                        {/* Fallback Message */}
                        <div className="space-y-2">
                          <Label htmlFor="fallbackMessage" className="text-slate-800 font-bold text-xs">Fallback Message</Label>
                          <p className="text-[11px] text-slate-400">Response output when there are no relevant documents matching the visitor's query.</p>
                          <Input
                            id="fallbackMessage"
                            value={fallbackMessage}
                            onChange={(e) => setFallbackMessage(e.target.value)}
                            className="focus-visible:ring-indigo-600 h-10 text-xs"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-2">
                          {/* Similarity Threshold */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-slate-800 font-bold text-xs">Similarity Threshold</Label>
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {similarityThreshold.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">Minimum score to accept document matching. Higher is stricter, lower retrieves more matches but risks hallucinations.</p>
                            <Slider
                              value={[similarityThreshold]}
                              onValueChange={(val) => setSimilarityThreshold(Array.isArray(val) ? val[0] : val)}
                              min={0.00}
                              max={1.00}
                              step={0.05}
                              className="py-2"
                            />
                          </div>

                          {/* Max Sources */}
                          <div className="space-y-3">
                            <Label htmlFor="maxSources" className="text-slate-800 font-bold text-xs">Max Sources to show</Label>
                            <p className="text-[11px] text-slate-400">Maximum number of text chunk citations to show inside the answers (V1 defaults to top 3).</p>
                            <select
                              id="maxSources"
                              value={maxSources}
                              onChange={(e) => setMaxSources(Number(e.target.value))}
                              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                              <option value={1}>1 Source</option>
                              <option value={2}>2 Sources</option>
                              <option value={3}>3 Sources (Recommended)</option>
                              <option value={5}>5 Sources</option>
                            </select>
                          </div>
                        </div>

                      </CardContent>
                      <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 justify-end rounded-b-lg">
                        <Button 
                          onClick={handleSaveSettings} 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-5 shadow-sm gap-2"
                        >
                          <Save className="h-4 w-4" /> Save Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* Right side configuration panels */}
                  <div className="space-y-6">
                    {/* Domain guardrails */}
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                          <Globe className="h-4.5 w-4.5 text-indigo-600" />
                          Security & Domains
                        </CardTitle>
                        <CardDescription>Control which websites are allowed to load your widget.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <form onSubmit={handleAddDomain} className="flex gap-2">
                          <Input
                            placeholder="https://mywebsite.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            className="text-xs h-9 focus-visible:ring-indigo-600 flex-1"
                          />
                          <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs">
                            Add
                          </Button>
                        </form>

                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Allowed Domains</span>
                          <div className="space-y-1.5">
                            {allowedDomains.map((domain) => (
                              <div key={domain} className="flex items-center justify-between border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                                <span className="text-xs text-slate-600 font-medium truncate max-w-[180px]">{domain}</span>
                                <button 
                                  onClick={() => handleRemoveDomain(domain)} 
                                  className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gemini Configuration Card */}
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                          <Bot className="h-4.5 w-4.5 text-indigo-600" />
                          Gemini Configuration
                        </CardTitle>
                        <CardDescription>Configure dynamic billing credentials and model versions.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        {/* Custom API Key */}
                        <div className="space-y-2">
                          <Label htmlFor="customApiKey" className="text-slate-800 font-bold text-xs">Custom Gemini API Key (Optional)</Label>
                          <p className="text-[10px] text-slate-400">If set, billing will be charged to this key instead of our platform default.</p>
                          <Input
                            id="customApiKey"
                            type="password"
                            placeholder="AIzaSy..."
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            className="focus-visible:ring-indigo-600 h-9 text-xs"
                          />
                        </div>

                        {/* Custom Model */}
                        <div className="space-y-2">
                          <Label htmlFor="customModel" className="text-slate-800 font-bold text-xs">Text Generation Model</Label>
                          <p className="text-[10px] text-slate-400">Select the model family used for widget streaming.</p>
                          <select
                            id="customModel"
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          >
                            <option value="gemini-flash-latest">Gemini 2.5 Flash (Recommended)</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Higher Quality)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                </div>
              </TabsContent>

              {/* INSTALLATION TAB */}
              <TabsContent value="installation">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                          <FileCode className="h-5 w-5 text-indigo-600" /> Install Script
                        </CardTitle>
                        <CardDescription>Follow these easy steps to embed the AI chatbot widget into your HTML website.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-200 mt-0.5">1</span>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">Copy the code snippet</h4>
                              <p className="text-xs text-slate-500 mt-0.5">Click the copy button below to copy the widget initialization script.</p>
                            </div>
                          </div>

                          <div className="relative mt-2">
                            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                              {embedCode}
                            </pre>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                navigator.clipboard.writeText(embedCode);
                                setCopiedSnippet(true);
                                setTimeout(() => setCopiedSnippet(false), 2000);
                              }} 
                              className="absolute right-3 top-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 gap-1.5 text-xs"
                            >
                              {copiedSnippet ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-green-500" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" /> Copy Code
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-200 mt-0.5">2</span>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">Paste in your HTML page</h4>
                              <p className="text-xs text-slate-500 mt-0.5">Open your website's HTML file (e.g. `index.html`), scroll to the bottom of the file, and paste the copied snippet code directly before the closing <code className="text-indigo-600 font-semibold font-mono">&lt;/body&gt;</code> tag.</p>
                            </div>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="border border-slate-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/10 dark:ring-emerald-500/20 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <CardTitle className="text-sm font-bold">Integration Status</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed font-medium">
                          The script is ready. Once embedded, the widget will load and automatically inherit your customized settings, styling tokens, and knowledge base.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

            </Tabs>

          </div>
        </div>

      </div>
    </div>
  );
}
