"use client";

import Meetings from "../components/Meetings";

export default function MeetingMinutes() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold md:text-4xl pt-2 sm:pt-3 md:pt-4 mb-6 sm:mb-8 text-black">Meeting Minutes</h1>
        <Meetings />
      </div>
    </main>
  );
}