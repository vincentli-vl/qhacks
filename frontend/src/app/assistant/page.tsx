"use client";

import ChatAssistant from "../components/ChatAssistant";

export default function Assistant() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <ChatAssistant />
    </div>
  );
}
