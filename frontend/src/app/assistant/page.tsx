"use client";

import ChatAssistant from "../components/ChatAssistant";

export default function Assistant() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <ChatAssistant />
      </div>
    </div>
  );
}
