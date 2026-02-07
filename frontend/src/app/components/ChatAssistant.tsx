/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: string;
  events?: any[];
  searchQuery?: string; // Store the original search query
}

const STORAGE_KEY = "chatbot_messages";
const ARCHIVE_KEY = "archive_records";

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
    // Save to archive
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
    
    const encodedData = encodeURIComponent(JSON.stringify(item));
    router.push(`/archive?data=${encodedData}&category=${category}`);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
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
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error.",
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

  // Extract main keyword from search query for natural text
  const getMainKeyword = (query: string): string => {
    const words = query.split(" ").filter((w) => w.length > 2);
    return words[0] || query;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col w-full max-w-4xl h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Assistant</h2>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center text-sm">
            Start a conversation about Kingston city services and events
          </p>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {/* Only show message text if it's from user or if no events are present */}
            {!(msg.role === "assistant" && msg.source === "local" && msg.events && msg.events.length > 0) && (
              <div
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-md px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}

            {/* Display results as boxes if they exist */}
            {msg.role === "assistant" && msg.events && msg.events.length > 0 && (
              <>
                {msg.source === "local" && msg.searchQuery && (
                  <p className="text-sm text-gray-700 mb-3 font-medium">
                    I found <span className="font-bold text-indigo-600">{msg.events.length} result{msg.events.length !== 1 ? "s" : ""}</span> regarding <span className="font-semibold text-indigo-600">&apos;{msg.searchQuery}&apos;</span>:
                  </p>
                )}
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {msg.events.map((eventObj, eventIdx) => (
                    <div
                      key={eventIdx}
                      onClick={() => {
                        const category = eventObj.category || "data";
                        handleResultClick(eventObj.data, category);
                      }}
                      className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-indigo-400 transition"
                    >
                      <div className="text-xs font-semibold text-indigo-600 mb-2 uppercase">
                        {(eventObj.category || "Data").replace(/_/g, " ")}
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-4">
                        {JSON.stringify(eventObj.data)
                          .substring(0, 150)
                          .replace(/[{}":]/g, "")}
                        ...
                      </div>
                      <div className="text-xs text-indigo-600 mt-2 font-semibold">
                        Click to view details →
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-gray-500 text-sm">Assistant is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about events, permits, licenses..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
