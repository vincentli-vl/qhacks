"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Meeting {
  date: string;
  meeting: string;
  meeting_url: string;
  documents: Record<string, string>;
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/events");
      const allMeetings: Meeting[] = response.data;

      // Parse and sort meetings by date (most recent first)
      const sortedMeetings = allMeetings
        .map((meeting) => ({
          ...meeting,
          parsedDate: parseDate(meeting.date),
        }))
        .sort((a, b) => {
          if (!a.parsedDate || !b.parsedDate) return 0;
          return b.parsedDate.getTime() - a.parsedDate.getTime();
        })
        .slice(0, 10) // Get 10 most recent
        .map(({ parsedDate, ...meeting }) => meeting); // Remove parsedDate

      setMeetings(sortedMeetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateString: string): Date | null => {
    try {
      // Handle formats like "November 4, 2024 6:00 pm - 8:00 pm" or "October 19, 2026 5:30 pm"
      const datePart = dateString.split(" - ")[0]; // Take the start time if there's a range
      return new Date(datePart);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-8">Loading meetings...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-gray-900 mb-6 underline">
        Recent Meetings
      </h2>

      <div className="space-y-4">
        {meetings.length === 0 ? (
          <p className="text-gray-500">No meetings found</p>
        ) : (
          meetings.map((meeting, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {meeting.meeting}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{meeting.date}</p>
                  <a
                    href={meeting.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-block"
                  >
                    View Full Meeting Page →
                  </a>
                </div>
                <button
                  onClick={() =>
                    setSelectedMeeting(
                      selectedMeeting === meeting.meeting_url
                        ? null
                        : meeting.meeting_url
                    )
                  }
                  className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                >
                  {selectedMeeting === meeting.meeting_url
                    ? "Hide Preview"
                    : "Show Preview"}
                </button>
              </div>

              {selectedMeeting === meeting.meeting_url && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Meeting Preview:
                  </h4>
                  <div className="w-full h-96 border border-gray-300 rounded-lg overflow-hidden">
                    <iframe
                      src={meeting.meeting_url}
                      className="w-full h-full"
                      title={`Preview of ${meeting.meeting}`}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  </div>
                </div>
              )}

              {Object.keys(meeting.documents).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Documents:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(meeting.documents).map(
                      ([docName, docUrl], docIdx) => (
                        <a
                          key={docIdx}
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition"
                        >
                          {docName}
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
