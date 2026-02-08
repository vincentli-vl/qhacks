"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

interface Meeting {
  date: string;
  meeting: string;
  meeting_url: string;
  documents: Record<string, string>;
  transcript?: TranscriptSegment[];
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
    null,
  );

  useEffect(() => {
    fetchMeetings();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      setIsRecording(true);

      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, {
          type: recorder.mimeType || "audio/webm",
        });

        setIsRecording(false);
        setMediaRecorder(null);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        setRecordingStream(null);

        // Prompt for meeting name
        const meetingName = prompt("Enter meeting name:", `Meeting - ${new Date().toLocaleString()}`);
        if (!meetingName) {
          return; // User cancelled
        }

        // Send audio to backend for processing
        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('meeting_name', meetingName);

          const response = await axios.post(
            'http://localhost:5001/api/process-audio',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          if (response.data.success) {
            // Refresh meetings to get the new one with transcript
            await fetchMeetings();
            alert('Meeting processed successfully! Transcript is now available.');
          } else {
            alert('Error processing audio: ' + (response.data.error || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Error processing audio:', error);
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.details || 
                              error.message || 
                              'Unknown error';
          alert(`Error processing audio: ${errorMessage}`);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);

      // Auto-stop after 30 minutes
      const timeoutId = setTimeout(
        () => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        },
        30 * 60 * 1000,
      );

      // Cleanup timeout on component unmount
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/events");
      const allMeetings: Meeting[] = response.data;

      // Parse and sort meetings: transcripts first, then by date (most recent first)
      const sortedMeetings = allMeetings
        .map((meeting) => ({
          ...meeting,
          parsedDate: parseDate(meeting.date),
          hasTranscript: meeting.transcript && meeting.transcript.length > 0,
        }))
        .sort((a, b) => {
          // First, prioritize meetings with transcripts
          if (a.hasTranscript && !b.hasTranscript) return -1;
          if (!a.hasTranscript && b.hasTranscript) return 1;
          
          // If both have transcripts or both don't, sort by date
          if (!a.parsedDate || !b.parsedDate) return 0;
          return b.parsedDate.getTime() - a.parsedDate.getTime();
        })
        .map(({ parsedDate, hasTranscript, ...meeting }) => meeting); // Remove helper fields

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-8">Loading meetings...</div>
    );
  }

  if (isProcessing) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Processing audio and generating transcript...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-serif text-gray-900 underline">
          Recent Meetings
        </h2>
        <div className="flex gap-2">
          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h12v12H6z" />
              </svg>
              Stop Recording
            </button>
          )}
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              isRecording
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-mic"
              viewBox="0 0 16 16"
            >
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5" />
              <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3" />
            </svg>
            {isRecording ? "Recording..." : "Record Meeting"}
          </button>
        </div>
      </div>

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
                  {meeting.meeting_url && meeting.meeting_url.startsWith('http') && (
                    <a
                      href={meeting.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-block"
                    >
                      View Full Meeting Page →
                    </a>
                  )}
                  {meeting.transcript && meeting.transcript.length > 0 && (
                    <span className="ml-4 text-sm text-green-600 font-medium">
                      ✓ Transcript Available
                    </span>
                  )}
                </div>
                <button
                  onClick={() =>
                    setSelectedMeeting(
                      selectedMeeting === `${meeting.meeting}-${meeting.date}`
                        ? null
                        : `${meeting.meeting}-${meeting.date}`,
                    )
                  }
                  className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                >
                  {selectedMeeting === `${meeting.meeting}-${meeting.date}`
                    ? "Hide Details"
                    : "Show Details"}
                </button>
              </div>

              {/* Show transcript prominently if available, even when details are collapsed */}
              {meeting.transcript && meeting.transcript.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-700">
                        Meeting Transcript ({meeting.transcript.length} segments)
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        const meetingId = `${meeting.meeting}-${meeting.date}`;
                        setExpandedTranscripts(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(meetingId)) {
                                newSet.delete(meetingId);
                              } else {
                                newSet.add(meetingId);
                              }
                              return newSet;
                            });
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-indigo-50 transition"
                        >
                          {expandedTranscripts.has(`${meeting.meeting}-${meeting.date}`) ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Collapse
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Expand Full Transcript
                            </>
                          )}
                        </button>
                      </div>
                      <div className={`space-y-3 bg-gray-50 p-4 rounded-lg transition-all ${
                        expandedTranscripts.has(`${meeting.meeting}-${meeting.date}`) 
                          ? 'max-h-none' 
                          : 'max-h-96 overflow-y-auto'
                      }`}>
                        {meeting.transcript.map((segment, segIdx) => (
                          <div
                            key={segIdx}
                            className="bg-white p-3 rounded border-l-4 border-indigo-500 hover:shadow-sm transition"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-indigo-600">
                                Speaker {segment.speaker}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(segment.start)} - {formatTime(segment.end)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{segment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

              {selectedMeeting === `${meeting.meeting}-${meeting.date}` && (
                <div className="mt-4 border-t pt-4">
                  {meeting.meeting_url && meeting.meeting_url.startsWith('http') && (
                    <div className="mb-4">
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
                      ),
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
