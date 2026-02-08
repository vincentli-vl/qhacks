"use client";

import { useState, useEffect } from "react";

interface PendingRequest {
  id: string;
  type: "policy" | "permit";
  title: string;
  description: string;
  submittedDate: string;
  submittedBy: string;
  details: string[];
  status: "pending" | "passed" | "failed";
  decision?: string;
  failureReason?: string;
}

export default function PendingRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    submittedBy: "",
    details: [""],
  });

  const fetchRequests = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/pending-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Error fetching requests", e);
      // Use empty array if backend is not available
      setRequests([]);
    }
  };

  // Load requests from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("http://localhost:5001/api/pending-requests");
        if (response.ok) {
          const data = await response.json();
          setRequests(data);
        }
      } catch (e) {
        console.error("Error fetching requests", e);
        setRequests([]);
      }
    })();
  }, []);

  const handleDetailChange = (index: number, value: string) => {
    const newDetails = [...formData.details];
    newDetails[index] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const addDetailField = () => {
    setFormData({ ...formData, details: [...formData.details, ""] });
  };

  const removeDetailField = (index: number) => {
    setFormData({
      ...formData,
      details: formData.details.filter((_, i) => i !== index),
    });
  };

  const handleSubmitRequest = async (type: "policy" | "permit") => {
    if (!formData.title || !formData.description || !formData.submittedBy) {
      alert("Please fill in all required fields");
      return;
    }

    const newRequest: PendingRequest = {
      id: `${type}_${Date.now()}`,
      type,
      title: formData.title,
      description: formData.description,
      submittedDate: new Date().toLocaleDateString(),
      submittedBy: formData.submittedBy,
      details: formData.details.filter((d) => d.trim() !== ""),
      status: "pending",
    };

    try {
      const response = await fetch("http://localhost:5001/api/pending-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      });

      if (response.ok) {
        setRequests([...requests, newRequest]);
        setFormData({ title: "", description: "", submittedBy: "", details: [""] });
        setShowPolicyForm(false);
        setShowPermitForm(false);
      }
    } catch (e) {
      console.error("Error submitting request", e);
      // Still add locally if backend fails
      setRequests([...requests, newRequest]);
      setFormData({ title: "", description: "", submittedBy: "", details: [""] });
      setShowPolicyForm(false);
      setShowPermitForm(false);
    }
  };

  const handleDecision = async (
    id: string,
    decision: "passed" | "failed",
    failureReason?: string
  ) => {
    const updatedRequests = requests.map((req) => {
      if (req.id === id) {
        return {
          ...req,
          status: decision,
          decision,
          failureReason: decision === "failed" ? failureReason : undefined,
        };
      }
      return req;
    });

    setRequests(updatedRequests);

    // Save to backend
    try {
      const request = updatedRequests.find((r) => r.id === id);
      if (request) {
        await fetch("http://localhost:5001/api/pending-requests", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        // Archive both passed and failed requests
        const archiveData = {
          query: `${decision === "passed" ? "Approved" : "Rejected"} ${request.type}: ${request.title}`,
          response: `${request.description}${decision === "failed" ? `\n\nRejection Reason: ${failureReason}` : ""}`,
          timestamp: String(Date.now()),
          status: decision,
          type: request.type,
          submittedBy: request.submittedBy,
          details: request.details,
        };

        try {
          await fetch("http://localhost:5001/api/pending-requests/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(archiveData),
          });
        } catch (e) {
          console.error("Error archiving request", e);
        }
      }
    } catch (e) {
      console.error("Error updating request", e);
    }
  };

  const pendingPolicies = requests.filter((r) => r.type === "policy" && r.status === "pending");
  const pendingPermits = requests.filter((r) => r.type === "permit" && r.status === "pending");
  const failedRequests = requests.filter((r) => r.status === "failed");

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Pending Requests</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Submit and manage pending policies and permits
          </p>
        </div>

        {/* Add New Request Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowPolicyForm(!showPolicyForm)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm sm:text-base"
          >
            + Add Policy
          </button>
          <button
            onClick={() => setShowPermitForm(!showPermitForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
          >
            + Add Permit
          </button>
        </div>

        {/* Policy Form */}
        {showPolicyForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Add New Policy</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Policy Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-sm sm:text-base"
              />
              <textarea
                placeholder="Policy Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 text-black text-sm sm:text-base"
              />
              <input
                type="text"
                placeholder="Submitted By *"
                value={formData.submittedBy}
                onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-sm sm:text-base"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Details
                </label>
                {formData.details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={`Detail ${idx + 1}`}
                      value={detail}
                      onChange={(e) => handleDetailChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-sm sm:text-base"
                    />
                    {formData.details.length > 1 && (
                      <button
                        onClick={() => removeDetailField(idx)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm sm:text-base"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addDetailField}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-xs sm:text-sm"
                >
                  + Add Detail
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmitRequest("policy")}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Submit Policy
                </button>
                <button
                  onClick={() => setShowPolicyForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permit Form */}
        {showPermitForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Permit</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Permit Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
              <textarea
                placeholder="Permit Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 text-black"
              />
              <input
                type="text"
                placeholder="Submitted By *"
                value={formData.submittedBy}
                onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Details
                </label>
                {formData.details.map((detail, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={`Detail ${idx + 1}`}
                      value={detail}
                      onChange={(e) => handleDetailChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black<"
                    />
                    {formData.details.length > 1 && (
                      <button
                        onClick={() => removeDetailField(idx)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addDetailField}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  + Add Detail
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmitRequest("permit")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Submit Permit
                </button>
                <button
                  onClick={() => setShowPermitForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Policies Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Pending Policies</h2>
          {pendingPolicies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending policies</p>
          ) : (
            <div className="grid gap-6">
              {pendingPolicies.map((policy) => (
                <RequestCard
                  key={policy.id}
                  request={policy}
                  onDecision={handleDecision}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pending Permits Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Pending Permits</h2>
          {pendingPermits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending permits</p>
          ) : (
            <div className="grid gap-6">
              {pendingPermits.map((permit) => (
                <RequestCard
                  key={permit.id}
                  request={permit}
                  onDecision={handleDecision}
                />
              ))}
            </div>
          )}
        </div>

        {/* Failed Requests Summary */}
        {failedRequests.length > 0 && (
          <div className="bg-red-50 rounded-lg p-8 border border-red-200">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              Failed/Rejected Requests ({failedRequests.length})
            </h2>
            <div className="space-y-3">
              {failedRequests.map((request) => (
                <div key={request.id} className="bg-white rounded p-4 border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {request.type === "policy" ? "Policy" : "Permit"}: {request.title}
                      </p>
                      {request.failureReason && (
                        <p className="text-sm text-red-700 mt-1">
                          <strong>Reason:</strong> {request.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RequestCardProps {
  request: PendingRequest;
  onDecision: (id: string, decision: "passed" | "failed", reason?: string) => void;
}

function RequestCard({ request, onDecision }: RequestCardProps) {
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [decisionMade, setDecisionMade] = useState(false);

  const handlePass = () => {
    onDecision(request.id, "passed");
    setDecisionMade(true);
  };

  const handleFail = () => {
    if (!failureReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    onDecision(request.id, "failed", failureReason);
    setDecisionMade(true);
  };

  if (decisionMade) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Submitted by: {request.submittedBy} on {request.submittedDate}
          </p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold border border-yellow-300">
          Pending
        </span>
      </div>

      <p className="text-gray-700 mb-4">{request.description}</p>

      {request.details.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Details:</h4>
          <ul className="space-y-1">
            {request.details.map((detail, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showDecisionForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => handlePass()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            ✓ Pass
          </button>
          <button
            onClick={() => setShowDecisionForm(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            ✗ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3 bg-red-50 rounded-lg p-4">
          <textarea
            placeholder="Reason for rejection... *"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 text-black"
          />
          <div className="flex gap-3">
            <button
              onClick={handleFail}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setShowDecisionForm(false);
                setFailureReason("");
              }}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
