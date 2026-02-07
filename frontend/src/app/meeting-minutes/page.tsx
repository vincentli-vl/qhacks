"use client";

import Meetings from "../components/Meetings";

export default function MeetingMinutes() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="ml-64 p-8">
        <h1 className="text-4xl pt-4 font-serif mb-8 text-black">Meeting Minutes</h1>
        <Meetings />
      </div>
    </main>
  );
}