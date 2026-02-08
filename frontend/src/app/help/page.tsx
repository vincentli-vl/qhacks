"use client";

import { useState } from "react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: "How do I search for information?",
    answer:
      "Use the AI Assistant to ask questions about Kingston city services, events, permits, licenses, and more. The system will search local data first and provide relevant results. If no local matches are found, it will use AI to answer your question.",
  },
  {
    id: 2,
    question: "What data can I search?",
    answer:
      "You can search through various Kingston city data including permits, licenses, bylaws, meeting minutes, council events, and more. The 'All Data' tab on the home page shows all available categories.",
  },
  {
    id: 3,
    question: "How do I view detailed information about a record?",
    answer:
      "Click on any search result from the chatbot or the 'All Data' tab. This will take you to a detail page where you can view all the information associated with that record.",
  },
  {
    id: 4,
    question: "What is the Archive feature?",
    answer:
      "The Archive feature automatically saves records when you click on them. This allows you to easily revisit important information you've discovered during your research.",
  },
  {
    id: 5,
    question: "Can I search across multiple categories?",
    answer:
      "Yes! You can use the category filter buttons in the 'All Data' tab to narrow your search to specific categories, or keep it on 'All' to search everything at once.",
  },
  {
    id: 6,
    question: "How do I save my chat history?",
    answer:
      "Your chat history is automatically saved in your browser. You can view it anytime from the 'Chat History' tab on the home page. Use the search feature to find specific conversations.",
  },
  {
    id: 7,
    question: "What if I can't find what I'm looking for?",
    answer:
      "Try using different search terms or keywords. The system supports fuzzy matching, so partial words work too (e.g., 'pets' will match 'pet'). You can also contact support for help with specific queries.",
  },
  {
    id: 8,
    question: "How often is the data updated?",
    answer:
      "Data is regularly updated with the latest Kingston city information. The AI Assistant will provide the most current information available in the system.",
  },
  {
    id: 9,
    question: "Is my data private?",
    answer:
      "Yes, your data is private and stored locally in your browser. You can clear your data at any time from the Settings page.",
  },
  {
    id: 10,
    question: "How do I clear my history?",
    answer:
      "You can clear your chat history from the Chat History tab by clicking the 'Clear History' button. Individual items can also be removed. Settings page offers additional data management options.",
  },
];

export default function Help() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Help & FAQ</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Find answers to common questions about using Kingston Records Hub
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <button
                onClick={() => toggleExpand(faq.id)}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 transition"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-4">
                  {faq.question}
                </h3>
                <svg
                  className={`w-5 h-5 text-[#22529F] flex-shrink-0 transition-transform ${
                    expandedId === faq.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {/* Expanded Content */}
              {expandedId === faq.id && (
                <div className="px-4 sm:px-6 pb-6 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-6 sm:p-8 border border-indigo-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-gray-700 text-sm sm:text-base mb-4">
            If you have additional questions or need further assistance, please
            reach out to our support team.
          </p>
          <button className="px-6 py-2 bg-[#22529F] text-white rounded-lg hover:bg-[#00377c] transition font-medium text-sm sm:text-base">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}