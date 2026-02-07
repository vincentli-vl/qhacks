/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: string;
  events?: any[];
  searchQuery?: string;
}

interface ArchiveRecord {
  id: string;
  category: string;
  data: Record<string, any>;
  timestamp: number;
}

interface AllData {
  [category: string]: any[];
}

const STORAGE_KEY = "chatbot_messages";
const FILTER_STATE_KEY = "home_page_filters";

export default function Home() {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [allData, setAllData] = useState<AllData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "data">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchChatQuery, setSearchChatQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedChatIndex, setExpandedChatIndex] = useState<number | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    // Load chat history
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading chat history", e);
      }
    }

    // Restore filter state if coming back from archive
    const savedFilters = sessionStorage.getItem(FILTER_STATE_KEY);
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setActiveTab(filters.activeTab || "chat");
        setSearchQuery(filters.searchQuery || "");
        setSearchChatQuery(filters.searchChatQuery || "");
        setSelectedCategory(filters.selectedCategory || null);
        sessionStorage.removeItem(FILTER_STATE_KEY);
      } catch (e) {
        console.error("Error restoring filters", e);
      }
    }

    // Load all data from backend
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/data");
      setAllData(response.data);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDataClick = (item: any, category: string) => {
    // Save current filter state before navigating
    sessionStorage.setItem(
      FILTER_STATE_KEY,
      JSON.stringify({
        activeTab,
        searchQuery,
        searchChatQuery,
        selectedCategory,
      })
    );
    const encodedData = encodeURIComponent(JSON.stringify(item));
    router.push(`/archive?data=${encodedData}&category=${category}`);
  };

  const clearChatHistory = () => {
    if (confirm("Are you sure you want to clear chat history?")) {
      localStorage.removeItem(STORAGE_KEY);
      setChatHistory([]);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 p-6">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Kingston Records Hub
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          View your chat history and archived records
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
            activeTab === "chat"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Chat History (
          {chatHistory.filter((msg) => msg.role === "user").length})
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
            activeTab === "data"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4m0 0V5c0-2.21-3.582-4-8-4S4 2.79 4 5v2m16 0a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          All Data ({Object.keys(allData).length})
        </button>
      </div>

      {/* Chat History Tab */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          {chatHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No chat history yet
            </p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Search chat history..."
                  value={searchChatQuery}
                  onChange={(e) => setSearchChatQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                />
              </div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Total prompts:{" "}
                  <span className="font-semibold">
                    {chatHistory.filter((msg) => msg.role === "user").length}
                  </span>
                </p>
                <button
                  onClick={clearChatHistory}
                  className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear History
                </button>
              </div>
              <div className="space-y-3">
                {chatHistory.map((msg, idx) => {
                  const matchesSearch =
                    searchChatQuery === "" ||
                    msg.content
                      .toLowerCase()
                      .includes(searchChatQuery.toLowerCase());
                  if (!matchesSearch) return null;

                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        setExpandedChatIndex(
                          expandedChatIndex === idx ? null : idx,
                        )
                      }
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        msg.role === "user"
                          ? "bg-indigo-100 ml-auto max-w-lg hover:bg-indigo-200"
                          : "bg-gray-100 max-w-lg hover:bg-gray-200"
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-600 mb-1">
                        {msg.role === "user" ? "You" : "Assistant"}
                      </div>
                      <p className="text-sm text-gray-900 break-words">
                        {expandedChatIndex === idx
                          ? msg.content
                          : `${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`}
                      </p>
                      {msg.events && msg.events.length > 0 && (
                        <div className="mt-2 text-xs text-indigo-600 font-semibold">
                          {msg.events.length} result(s)
                        </div>
                      )}

                      {/* Show expanded results if this message is expanded and has events */}
                      {expandedChatIndex === idx &&
                        msg.events &&
                        msg.events.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-indigo-200 space-y-3">
                            <p className="text-xs font-semibold text-indigo-600">
                              Results:
                            </p>
                            {msg.events.map((eventObj, eventIdx) => (
                              <div
                                key={eventIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const category = eventObj.category || "data";
                                  handleDataClick(eventObj.data, category);
                                }}
                                className="bg-white border border-indigo-200 rounded p-2 cursor-pointer hover:shadow-sm transition text-xs"
                              >
                                <div className="font-semibold text-indigo-600 mb-1">
                                  {(eventObj.category || "Data").replace(
                                    /_/g,
                                    " ",
                                  )}
                                </div>
                                <div className="text-gray-700">
                                  {JSON.stringify(eventObj.data)
                                    .substring(0, 100)
                                    .replace(/[{}":]/g, "")}
                                  ...
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* All Data Tab */}
      {activeTab === "data" && (
        <div className="space-y-4">
          {Object.keys(allData).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data available</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      selectedCategory === null
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {Object.keys(allData).map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                        selectedCategory === category
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {category.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const itemsToShow: Array<{ item: any; category: string }> =
                    [];
                  const categoriesToCheck = selectedCategory
                    ? [selectedCategory]
                    : Object.keys(allData);

                  categoriesToCheck.forEach((cat) => {
                    const items = allData[cat] || [];
                    items.forEach((item) => {
                      const itemStr = JSON.stringify(item).toLowerCase();
                      if (
                        searchQuery === "" ||
                        itemStr.includes(searchQuery.toLowerCase())
                      ) {
                        itemsToShow.push({ item, category: cat });
                      }
                    });
                  });

                  return itemsToShow.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-8">
                      No results found
                    </p>
                  ) : (
                    itemsToShow.map((obj, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleDataClick(obj.item, obj.category)}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                          {obj.category.replace(/_/g, " ")}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {JSON.stringify(obj.item)
                            .substring(0, 150)
                            .replace(/[{}\"]/g, "")}
                          ...
                        </p>
                      </div>
                    ))
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
