"use client";

import EventsList from "./EventsList";
import ChatAssistant from "./ChatAssistant";

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
        Council Events Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Section */}
        <div className="lg:col-span-2">
          <EventsList />
        </div>

        {/* AI Assistant Section */}
        <div className="lg:col-span-1">
          <ChatAssistant />
        </div>
      </div>
    </div>
  );
}
