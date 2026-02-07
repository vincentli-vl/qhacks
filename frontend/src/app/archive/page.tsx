/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface ArchiveItem {
  category: string;
  data: Record<string, any>;
}

export default function ArchivePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [item, setItem] = useState<ArchiveItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const encodedData = searchParams.get("data");
    const category = searchParams.get("category");

    if (encodedData && category) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(encodedData));
        setTimeout(() => {
          setItem({ category, data: decodedData });
          setLoading(false);
        }, 0);
      } catch (error) {
        console.error("Error parsing data:", error, "Raw data:", encodedData);
        setTimeout(() => {
          setItem(null);
          setLoading(false);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setItem(null);
        setLoading(false);
      }, 0);
    }
  }, [searchParams]);

  if (loading) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 md:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-arrow-left"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
            />
          </svg>
          Back
        </button>
        <div className="text-center text-gray-500">No data to display</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-arrow-left"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
            />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 capitalize">
            {item.category.replace(/_/g, " ")} Details
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Category: <span className="font-semibold">{item.category}</span>
          </p>

          <div className="grid grid-cols-1 gap-6">
            {Object.entries(item.data).map(([key, value]) => (
              <div
                key={key}
                className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                  {key.replace(/_/g, " ")}
                </h3>

                {typeof value === "object" && value !== null ? (
                  <div className="bg-gray-50 rounded p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ) : typeof value === "string" && value.startsWith("http") ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 hover:underline break-all"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-gray-700 break-words">{String(value)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
