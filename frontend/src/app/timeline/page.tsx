"use client";

import { useState } from "react";

interface TimelineEvent {
  id: number;
  date: string;
  title: string;
  description: string;
  type: "proposal" | "debate" | "decision" | "rejection";
  status: "in-progress" | "completed" | "failed";
  details: string[];
  reason?: string;
}

const timelineData: TimelineEvent[] = [
  {
    id: 1,
    date: "January 15, 2024",
    title: "Affordable Housing Initiative Proposal",
    description: "City council proposes new affordable housing development program",
    type: "proposal",
    status: "in-progress",
    details: [
      "Budget allocation: $50 million over 5 years",
      "Target zones identified in downtown and suburbs",
      "Partnership with local developers planned",
    ],
  },
  {
    id: 2,
    date: "February 2, 2024",
    title: "First Community Debate on Housing",
    description: "Public hearing on the affordable housing proposal",
    type: "debate",
    status: "completed",
    details: [
      "200+ residents attended the meeting",
      "Support: 65% in favor, concerns about traffic and density",
      "Opposition: 35% cited environmental and parking concerns",
      "Questions raised about long-term maintenance costs",
    ],
  },
  {
    id: 3,
    date: "February 20, 2024",
    title: "City Council Committee Review",
    description: "Finance and planning committees review the proposal",
    type: "debate",
    status: "completed",
    details: [
      "Finance committee approved budget allocation",
      "Planning committee requested environmental impact study",
      "Proposed amendments to address parking concerns",
      "Recommended 6-month feasibility study before full approval",
    ],
  },
  {
    id: 4,
    date: "March 10, 2024",
    title: "Environmental Impact Study Commissioned",
    description: "Independent study ordered to assess environmental effects",
    type: "proposal",
    status: "in-progress",
    details: [
      "Study timeline: 4 months",
      "Focus areas: traffic impact, water systems, green space",
      "Budget: $250,000",
      "Expected completion: July 2024",
    ],
  },
  {
    id: 5,
    date: "April 5, 2024",
    title: "Council Member Opposition Emerges",
    description: "Three council members raise concerns about cost-sharing",
    type: "debate",
    status: "completed",
    details: [
      "Concern: Private developers receiving too many incentives",
      "Question: Is public funding properly leveraged?",
      "Proposal to revise public-private partnership terms",
      "Call for additional transparency requirements",
    ],
  },
  {
    id: 6,
    date: "May 1, 2024",
    title: "Budget Amendment Proposed",
    description: "New financing structure proposed to address cost concerns",
    type: "proposal",
    status: "completed",
    details: [
      "Increase in developer contribution from 30% to 40%",
      "Creation of oversight committee for project monitoring",
      "Annual reporting requirements to city council",
      "Performance metrics for affordability standards",
    ],
  },
  {
    id: 7,
    date: "June 15, 2024",
    title: "Second Public Hearing",
    description: "Community feedback on revised proposal",
    type: "debate",
    status: "completed",
    details: [
      "Increased developer contribution well-received",
      "New concerns raised about gentrification timeline",
      "Request for rent stabilization provisions",
      "Demand for local hiring requirements in construction",
    ],
  },
  {
    id: 8,
    date: "July 20, 2024",
    title: "Environmental Study Delayed",
    description: "Impact assessment report delayed by 2 months",
    type: "rejection",
    status: "failed",
    details: [
      "Reason: Additional groundwater testing required",
      "Discovery of potential soil contamination in one zone",
      "New timeline: September 2024",
      "Additional study cost: $75,000",
    ],
    reason: "Environmental concerns requiring further investigation",
  },
  {
    id: 9,
    date: "August 10, 2024",
    title: "Council Discussion on Timeline",
    description: "Debate about project viability with extended timeline",
    type: "debate",
    status: "completed",
    details: [
      "Concern: Project delays affecting developer interest",
      "Some members propose proceeding without full study",
      "Others advocate for strict environmental standards",
      "Compromise: Move forward with contingency plans",
    ],
  },
  {
    id: 10,
    date: "September 25, 2024",
    title: "Final Environmental Report Released",
    description: "Environmental impact study completed with recommendations",
    type: "decision",
    status: "completed",
    details: [
      "Report: Feasible with mitigation measures",
      "Required: Soil remediation in one zone",
      "Cost estimate for remediation: $2 million",
      "Timeline impact: Additional 3-4 months needed",
    ],
  },
  {
    id: 11,
    date: "October 15, 2024",
    title: "Final Vote Scheduled",
    description: "City council to vote on affordable housing initiative",
    type: "decision",
    status: "in-progress",
    details: [
      "Vote date: November 5, 2024",
      "Council members: 7 likely yes, 2 undecided",
      "Public comment period: 2 weeks",
      "Expected decision impact on Q1 2025 construction start",
    ],
  },
];

export default function Timeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "completed" | "failed">("all");

  const filteredTimeline = timelineData.filter((event) => {
    const matchesSearch =
      searchQuery === "" ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.details.some((detail) => detail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
    <div className="p-8 ml-64">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Policy Timeline</h1>
          <p className="text-gray-600">
            Track the journey of policies from proposal to implementation
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search timeline by policy name, description, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setStatusFilter("in-progress")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                statusFilter === "in-progress"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                statusFilter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter("failed")}
              className={`px-4 py-2 rounded-full font-medium transition ${
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
        {filteredTimeline.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">
              No timeline events found matching your search. Try different keywords.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Central line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-indigo-600"></div>

            {/* Timeline events */}
            <div className="space-y-6">
              {filteredTimeline.map((event) => (
                <div key={event.id} className="relative pl-24">
                  {/* Timeline dot */}
                  <div className="absolute left-0 w-16 h-16 bg-white rounded-full border-4 border-indigo-600 flex items-center justify-center text-2xl shadow-md">
                    {getTypeIcon(event.type)}
                  </div>

                  {/* Event card */}
                  <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{event.date}</p>
                      </div>
                      <span
                        className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
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

                    <p className="text-gray-700 mb-4">{event.description}</p>

                    {/* Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Details:</h4>
                      <ul className="space-y-2">
                        {event.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="text-indigo-600 mt-1">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Failure reason if applicable */}
                    {event.reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 mb-1">Why it failed/was delayed:</h4>
                        <p className="text-red-800 text-sm">{event.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-12">
          <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
            <p className="text-3xl font-bold text-blue-600">
              {timelineData.filter((e) => e.status === "in-progress").length}
            </p>
            <p className="text-gray-700 mt-2">In Progress</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 text-center border border-green-200">
            <p className="text-3xl font-bold text-green-600">
              {timelineData.filter((e) => e.status === "completed").length}
            </p>
            <p className="text-gray-700 mt-2">Completed</p>
          </div>
          <div className="bg-red-50 rounded-lg p-6 text-center border border-red-200">
            <p className="text-3xl font-bold text-red-600">
              {timelineData.filter((e) => e.status === "failed").length}
            </p>
            <p className="text-gray-700 mt-2">Failed/Delayed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
