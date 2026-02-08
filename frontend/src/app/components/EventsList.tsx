"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

interface Event {
  date: string;
  meeting: string;
  meeting_url: string;
  documents: {
    "Agenda HTML"?: string;
    "Agenda PDF"?: string;
    "Minutes HTML"?: string;
    "Minutes PDF"?: string;
  };
}

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/events");
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEvents = useCallback(() => {
    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newEvents = events.slice(start, end);
    
    if (newEvents.length > 0) {
      setDisplayedEvents((prev) => [...prev, ...newEvents]);
      setPage(nextPage);
    }
  }, [page, events]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Load initial batch
    if (events.length > 0) {
      loadMoreEvents();
    }
  }, [events, loadMoreEvents]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedEvents.length < events.length) {
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
  }, [displayedEvents, events, loadMoreEvents]);

  if (loading) {
    return <div className="text-center text-gray-500">Loading events...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h2>

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-gray-500">No events found</p>
        ) : (
          <>
            {displayedEvents.map((event, idx) => (
              <div
                key={idx}
                className="border-l-4 border-indigo-500 pl-4 py-3 hover:bg-gray-50 rounded transition"
              >
                <a
                  href={event.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-indigo-600"
                >
                  {event.meeting}
                </a>
                <p className="text-sm text-gray-600">{event.date}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {event.documents["Agenda HTML"] && (
                    <a
                      href={event.documents["Agenda HTML"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Agenda HTML
                    </a>
                  )}
                  {event.documents["Agenda PDF"] && (
                    <a
                      href={event.documents["Agenda PDF"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Agenda PDF
                    </a>
                  )}
                  {event.documents["Minutes HTML"] && (
                    <a
                      href={event.documents["Minutes HTML"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Minutes HTML
                    </a>
                  )}
                  {event.documents["Minutes PDF"] && (
                    <a
                      href={event.documents["Minutes PDF"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Minutes PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
            
            {displayedEvents.length < events.length && (
              <div
                ref={observerTarget}
                className="text-center text-gray-500 py-4"
              >
                Loading more events...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
