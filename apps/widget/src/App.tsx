import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Minus,
  Sparkles
} from "lucide-react";

interface MessageSource {
  documentId: string;
  fileName: string;
  textSnippet: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: MessageSource[];
}

interface WidgetSettings {
  projectId: string;
  name: string;
  fallbackMessage: string;
}

interface AppProps {
  projectId: string;
  apiUrl?: string;
}

export default function App({ projectId, apiUrl = "http://localhost:3001" }: AppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WidgetSettings>({
    projectId,
    name: "AI Assistant",
    fallbackMessage: "I couldn't find that information in the uploaded documents."
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load configuration and message history
  useEffect(() => {
    // 1. Fetch project settings
    fetch(`${apiUrl}/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => {
        setSettings({
          projectId: data.id,
          name: data.name,
          fallbackMessage: data.fallbackMessage
        });
      })
      .catch((err) => {
        console.warn("Using default settings. API server might be offline.", err);
      });

    // 2. Load conversation logs
    const savedConvId = localStorage.getItem(`kw_conv_${projectId}`);
    const savedMessages = localStorage.getItem(`kw_messages_${projectId}`);

    if (savedConvId) setConversationId(savedConvId);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        localStorage.removeItem(`kw_messages_${projectId}`);
      }
    } else {
      // Setup initial welcome greeting
      const welcomeMsg: Message = {
        role: "assistant",
        content: "Hi 👋 Ask me anything about our documents!"
      };
      setMessages([welcomeMsg]);
      localStorage.setItem(`kw_messages_${projectId}`, JSON.stringify([welcomeMsg]));
    }
  }, [projectId, apiUrl]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue("");

    // Append user message
    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    localStorage.setItem(`kw_messages_${projectId}`, JSON.stringify(updatedMessages));

    setIsTyping(true);

    // Placeholder for stream text construction
    let streamedResponse = "";
    
    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conversationId,
          message: userMsg
        })
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

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
          
          // Split buffer by SSE newline frames
          const parts = buffer.split("\n\n");
          // Keep the last partial line in the buffer
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.text) {
                streamedResponse += parsed.text;
                // Update the last message content
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
                // Save conversation ID and citations
                if (parsed.conversationId) {
                  setConversationId(parsed.conversationId);
                  localStorage.setItem(`kw_conv_${projectId}`, parsed.conversationId);
                }

                // Update final message with citations
                setMessages(prev => {
                  const copy = [...prev];
                  const lastIdx = copy.length - 1;
                  copy[lastIdx] = {
                    role: "assistant",
                    content: streamedResponse,
                    sources: parsed.sources || []
                  };
                  // Persist to local history
                  localStorage.setItem(`kw_messages_${projectId}`, JSON.stringify(copy));
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
      console.error("Error fetching stream:", error);
      setIsTyping(false);
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        copy[lastIdx] = {
          role: "assistant",
          content: "Unable to generate a response. Please check your internet connection and try again."
        };
        return copy;
      });
    }
  };

  const clearHistory = () => {
    if (confirm("Reset chat history?")) {
      const welcomeMsg: Message = {
        role: "assistant",
        content: `Hi 👋 Ask me anything about our documents!`
      };
      setMessages([welcomeMsg]);
      setConversationId(null);
      localStorage.removeItem(`kw_messages_${projectId}`);
      localStorage.removeItem(`kw_conv_${projectId}`);
    }
  };

  return (
    <div className="font-sans antialiased text-slate-800 flex flex-col items-end">
      {/* 1. Expandable Chat Window */}
      {isOpen && (
        <div className="flex flex-col w-[370px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden mb-4 transition-all duration-300 transform scale-100 origin-bottom-right">
          
          {/* Header bar */}
          <div className="bg-indigo-600 px-5 py-4 text-white flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 border border-indigo-400">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide leading-tight">{settings.name}</h3>
                <span className="flex items-center gap-1 text-[10px] text-indigo-200 mt-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearHistory}
                title="Reset Chat"
                className="p-1.5 hover:bg-indigo-500 rounded-lg text-indigo-100 hover:text-white transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-indigo-500 rounded-lg text-indigo-100 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 p-4 bg-slate-50 overflow-y-auto space-y-3 scrollbar-thin">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-2 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 text-xs font-semibold select-none ${
                  msg.role === "user" 
                    ? "bg-slate-800 text-white" 
                    : "bg-indigo-600 text-white"
                }`}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className="space-y-1">
                  <div className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm border ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white border-slate-700 rounded-tr-none"
                      : "bg-white text-slate-800 border-slate-200/50 rounded-tl-none"
                  }`}>
                    {msg.content === "" ? (
                      <div className="flex items-center gap-1 text-slate-400 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {/* Citations block */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="text-[9px] text-slate-400 px-1 font-semibold flex items-center gap-1">
                      <span>Source:</span>
                      <span className="underline italic text-indigo-500">
                        {Array.from(new Set(msg.sources.map(s => s.fileName))).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Custom bot typing indicator */}
            {isTyping && messages[messages.length - 1]?.content !== "" && (
              <div className="flex gap-2 max-w-[80%] mr-auto">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white flex-shrink-0 select-none">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-white border border-slate-200/50 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs text-slate-400 shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer input form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-600 flex-1"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Branding */}
          <div className="bg-white text-[9px] text-slate-400 text-center py-1.5 border-t border-slate-50 flex items-center justify-center gap-1 select-none flex-shrink-0 font-medium">
            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
            Powered by <strong className="text-indigo-600 font-semibold">KnowledgeWidget AI</strong>
          </div>

        </div>
      )}

      {/* 2. Floating Circular Open Bubble Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-indigo-500 select-none cursor-pointer"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300 rotate-90" />
        ) : (
          <MessageSquare className="h-6 w-6 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}
