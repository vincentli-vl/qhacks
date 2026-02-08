/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { encodeArchivePayload } from "../utils/archive";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: string;
  events?: any[];
  searchQuery?: string; // Store the original search query
}

const STORAGE_KEY = "chatbot_messages";
const ARCHIVE_KEY = "archive_records";

/** Get a short display title for an archive record (links AI answer to the JSON data). */
function getSourceTitle(data: Record<string, unknown>): string {
  if (!data || typeof data !== "object") return "View record";
  const title =
    (data.heading as string) ||
    (data.title as string) ||
    (data.name as string) ||
    (data.description as string);
  if (title && typeof title === "string") return title.length > 60 ? title.slice(0, 60) + "…" : title;
  const text = data.text as string;
  if (text && typeof text === "string") return text.slice(0, 50).trim() + "…";
  return "View record";
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading messages from localStorage", e);
      }
    }
    setHydrated(true);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, hydrated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleResultClick = (item: any, category: string) => {
    const archiveKey = `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      id: archiveKey,
      category,
      data: item,
      timestamp: Date.now(),
    };
    const archive = localStorage.getItem(ARCHIVE_KEY);
    const records = archive ? JSON.parse(archive) : [];
    records.push(record);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(records));
    const d = encodeArchivePayload(typeof item === "object" && item !== null ? item : { data: item });
    router.push(`/archive?d=${d}&category=${encodeURIComponent(category)}`);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5001/api/chat", {
        message: input,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.response,
        source: response.data.source,
        events: response.data.events || [],
        searchQuery: input, // Store the original search query
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { details?: string; error?: string } } };
      const details = err.response?.data?.details || err.response?.data?.error || "Check the backend console for details.";
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: `Sorry, something went wrong: ${details}`,
        source: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col w-full max-w-4xl h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
      <h2 className="text-xl sm:text-3xl font-bold text-center justify-center items-center text-gray-900 mb-2">Ask the Past</h2>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center text-xs sm:text-sm">
            Artificial Intelligence Powered by the Kingston Archives
          </p>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {/* Always show message content (AI response or user message) */}
            <div
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs sm:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[#22529F] text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>

            {/* Card context: archive records used for this answer (same as home page — click to open) */}
            {msg.role === "assistant" && msg.events && msg.events.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-200 space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-[#22529F]">
                  Archive data used for this answer ({msg.events.length} record{msg.events.length !== 1 ? "s" : ""} — click to view):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {msg.events.map((eventObj, eventIdx) => {
                    const category = eventObj.category || "data";
                    const data = eventObj.data || {};
                    const title = getSourceTitle(data);
                    return (
                      <button
                        key={eventIdx}
                        type="button"
                        onClick={() => handleResultClick(data, category)}
                        className="text-left bg-white border border-indigo-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md hover:border-[#22529F] transition focus:outline-none focus:ring-2 focus:ring-[#00377c]"
                      >
                        <div className="text-xs font-semibold text-[#22529F] mb-1 uppercase">
                          {(category as string).replace(/_/g, " ")}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-800 font-medium line-clamp-2 mb-1">
                          {title}
                        </div>
                        <div className="text-xs text-[#22529F] mt-2 font-semibold">
                          Open in archive →
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-gray-500 text-xs sm:text-sm">Assistant is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about events, permits..."
          className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22529F] text-black text-sm sm:text-base"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 sm:px-4 py-2 bg-[#22529F] text-white rounded-lg hover:bg-[#00377c] cursor-pointer disabled:bg-gray-400 transition text-sm sm:text-base font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
