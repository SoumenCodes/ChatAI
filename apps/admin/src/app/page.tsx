"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { getProjects, createProject, DashboardProject } from "@/lib/api";
import { 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Folder, 
  FileText,
  Calendar,
  ChevronRight,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load projects from API on mount
  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error("Error loading projects:", err));
  }, []);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    createProject(newProjectName.trim())
      .then((newProj) => {
        setProjects([newProj, ...projects]);
        setNewProjectName("");
        setIsDialogOpen(false);
      })
      .catch((err) => {
        alert("Failed to create project");
        console.error(err);
      });
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Layout */}
      <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium text-slate-500">
              Projects / Overview
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Soumen</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              S
            </div>
            <span className="text-xs text-slate-400 font-medium">Admin</span>
          </div>
        </header>

        {/* Core Layout Page Content */}
        <main className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Projects</h2>
              <p className="text-slate-500 text-sm">Create and manage chatbot brains for your websites.</p>
            </div>

            {/* Create Project Modal Trigger */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-medium transition-all duration-200">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              } />
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateProject}>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Give your chatbot a name. You can configure documents and settings right after.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g. CardioCare Hospital"
                        className="col-span-3 focus-visible:ring-indigo-600"
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Create Project
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Grid of Projects */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="group h-full border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <CardTitle className="text-base font-extrabold text-slate-800 font-heading truncate group-hover:text-indigo-600 transition-colors duration-200">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                          ID: <span className="truncate">{project.id}</span>
                          <button
                            onClick={(e) => copyToClipboard(project.id, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                          >
                            {copiedId === project.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 flex-1">
                    <p className="text-xs text-slate-500 line-clamp-2 italic">
                      &ldquo;{project.systemPrompt}&rdquo;
                    </p>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50 rounded-b-lg">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <strong>{project.documents?.length || 0}</strong> doc{(project.documents?.length || 0) === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-0.5">
                      Configure <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-300 rounded-xl bg-white text-center">
              <Folder className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">No Projects Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">
                Create your first project to configure a knowledge base chatbot.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow"
              >
                Create a Project
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
