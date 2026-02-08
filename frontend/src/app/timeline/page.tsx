/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";

interface TimelineEvent {
  id: number | string;
  date: string;
  title: string;
  description: string;
  type: "proposal" | "debate" | "decision" | "rejection";
  status: "in-progress" | "completed" | "failed";
  details: string[];
  reason?: string;
  isPendingRequest?: boolean;
  category?: string;
}

export default function Timeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "completed" | "failed">("all");
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;

  // Fetch all data and convert to timeline events
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch all data from the API
        const [dataResponse, pendingResponse, meetingsResponse] = await Promise.all([
          axios.get("http://localhost:5001/api/data"),
          axios.get("http://localhost:5001/api/pending-requests"),
          axios.get("http://localhost:5001/api/events"),
        ]);

        const allData = dataResponse.data;
        const pendingRequests = pendingResponse.data;
        const meetings = meetingsResponse.data;

        const events: TimelineEvent[] = [];

        // Convert meetings to timeline events
        meetings.forEach((meeting: any, idx: number) => {
          const meetingDate = new Date(meeting.date.split(" - ")[0]);
          // Create unique ID using meeting URL or combination of date and title with index
          const uniqueId = meeting.meeting_url || `meeting_${meetingDate.getTime()}_${idx}`;
          events.push({
            id: uniqueId,
            date: meetingDate.toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            }),
            title: meeting.meeting,
            description: `City Council Meeting - ${meeting.meeting}`,
            type: "debate" as const,
            status: "completed" as const,
            details: Object.entries(meeting.documents).map(([key, value]) => `${key}: Available`),
            category: "Council Meeting",
          });
        });

        // Convert pending requests to timeline events
        pendingRequests
          .filter((req: any) => req.status === "passed" || req.status === "failed")
          .forEach((req: any, idx: number) => {
            events.push({
              id: `pending_${req.id || idx}_${Date.now()}_${idx}`,
              date: req.submittedDate || new Date().toLocaleDateString(),
              title: `${req.status === "passed" ? "✓ Approved" : "✗ Rejected"}: ${req.title}`,
              description: req.description,
              type: req.status === "passed" ? ("decision" as const) : ("rejection" as const),
              status: req.status === "passed" ? ("completed" as const) : ("failed" as const),
              details: req.details || [],
              reason: req.failureReason,
              isPendingRequest: true,
              category: req.type,
            });
          });

        // Convert data from various categories to timeline events
        Object.entries(allData).forEach(([category, items]: [string, any]) => {
          if (Array.isArray(items)) {
            items.forEach((item: any, idx: number) => {
              // Extract a timestamp or date if available
              const dateStr = item.timestamp || item.date || item.submittedDate || new Date().toISOString();
              const itemDate = new Date(dateStr);
              
              // Create a title from the item
              const title = item.heading || item.title || item.meeting || `${category.replace(/_/g, " ")} Entry`;
              
              // Create description from text or other fields
              const description = item.text || item.description || JSON.stringify(item).substring(0, 200);

              events.push({
                id: `data_${category}_${idx}_${itemDate.getTime()}`,
                date: itemDate.toLocaleDateString("en-US", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                }),
                title: title,
                description: description,
                type: "proposal" as const,
                status: "completed" as const,
                details: [
                  `Category: ${category.replace(/_/g, " ")}`,
                  ...(item.pdfs && item.pdfs.length > 0 ? [`Documents: ${item.pdfs.length} available`] : []),
                ],
                category: category,
              });
            });
          }
        });

        // Sort events by date (most recent first)
        events.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setAllEvents(events);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const filteredTimeline = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesSearch =
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.details.some((detail) => detail.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allEvents, searchQuery, statusFilter]);

  // Lazy loading logic
  const loadMoreEvents = useCallback(() => {
    const nextPage = page + 1;
    const start = nextPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newEvents = filteredTimeline.slice(start, end);
    
    if (newEvents.length > 0) {
      setDisplayedEvents((prev) => [...prev, ...newEvents]);
      setPage(nextPage);
    }
  }, [page, filteredTimeline, ITEMS_PER_PAGE]);

  // Reset displayed events when filters change
  useEffect(() => {
    setPage(0);
    setDisplayedEvents(filteredTimeline.slice(0, ITEMS_PER_PAGE));
  }, [filteredTimeline, ITEMS_PER_PAGE]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMoreEvents();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreEvents, loading]);

  // Show/hide back to top button based on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "proposal":
        return "📋";
      case "debate":
        return "💬";
      case "decision":
        return "✓";
      case "rejection":
        return "✗";
      default:
        return "•";
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Policy Timeline</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Track the journey of policies from proposal to implementation
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-sm sm:text-base"
            />
          </div>

          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-full font-medium transition text-xs sm:text-sm ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setStatusFilter("in-progress")}
              className={`px-3 sm:px-4 py-2 rounded-full font-medium transition text-xs sm:text-sm ${
                statusFilter === "in-progress"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 sm:px-4 py-2 rounded-full font-medium transition text-xs sm:text-sm ${
                statusFilter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter("failed")}
              className={`px-3 sm:px-4 py-2 rounded-full font-medium transition text-xs sm:text-sm ${
                statusFilter === "failed"
                  ? "bg-red-600 text-white"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              }`}
            >
              Failed/Delayed
            </button>
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 text-base sm:text-lg">Loading timeline...</p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 text-base sm:text-lg">
              No timeline events found matching your search.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Central line - hidden on mobile */}
            <div className="hidden sm:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-indigo-600"></div>

            {/* Timeline events */}
            <div className="space-y-6">
              {displayedEvents.map((event) => (
                <div key={event.id} className="relative sm:pl-24 pl-6">
                  {/* Timeline dot - repositioned for mobile */}
                  <div className="absolute left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full border-4 border-indigo-600 flex items-center justify-center text-lg sm:text-2xl shadow-md">
                    {getTypeIcon(event.type)}
                  </div>

                  {/* Event card */}
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{event.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">{event.date}</p>
                      </div>
                      <span
                        className={`px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold border whitespace-nowrap ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {event.status === "in-progress"
                          ? "In Progress"
                          : event.status === "completed"
                          ? "Completed"
                          : "Failed/Delayed"}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4 text-sm sm:text-base">{event.description}</p>

                    {/* Details */}
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Details:</h4>
                      <ul className="space-y-2">
                        {event.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                            <span className="text-indigo-600 mt-1 flex-shrink-0">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Failure reason if applicable */}
                    {event.reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                        <h4 className="font-semibold text-red-900 mb-1 text-sm sm:text-base">Why it failed/was delayed:</h4>
                        <p className="text-red-800 text-xs sm:text-sm">{event.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {displayedEvents.length < filteredTimeline.length && (
                  <p className="text-gray-500 text-sm">Loading more...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">
              {allEvents.filter((e) => e.status === "in-progress").length}
            </p>
            <p className="text-gray-700 text-sm sm:text-base mt-2">In Progress</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 text-center border border-green-200">
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {allEvents.filter((e) => e.status === "completed").length}
            </p>
            <p className="text-gray-700 text-sm sm:text-base mt-2">Completed</p>
          </div>
          <div className="bg-red-50 rounded-lg p-6 text-center border border-red-200">
            <p className="text-2xl sm:text-3xl font-bold text-red-600">
              {allEvents.filter((e) => e.status === "failed").length}
            </p>
            <p className="text-gray-700 text-sm sm:text-base mt-2">Failed/Delayed</p>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-110"
          aria-label="Back to top"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
