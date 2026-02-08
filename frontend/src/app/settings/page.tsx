"use client";

import { useState } from "react";

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailDigest: false,
    darkMode: false,
    dataRetention: "90days",
  });

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === "boolean") {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600 text-sm sm:text-base">Customize your application preferences</p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-8">
          {/* Notifications Section */}
          <div className="pb-8 border-b border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Notifications</h2>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Enable Notifications
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Receive notifications for search results and updates
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("notifications")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition flex-shrink-0 ${
                    settings.notifications ? "bg-[#22529F]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.notifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Email Digest
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Get a weekly summary of your activity
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("emailDigest")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition flex-shrink-0 ${
                    settings.emailDigest ? "bg-[#22529F]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.emailDigest ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Display Section */}
          <div className="pb-8 border-b border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Display</h2>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Dark Mode
                </label>
                <p className="text-xs sm:text-sm text-gray-600">
                  Switch to dark theme for better visibility at night
                </p>
              </div>
              <button
                onClick={() => handleToggle("darkMode")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition flex-shrink-0 ${
                  settings.darkMode ? "bg-[#22529F]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Data Management Section */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Data Management</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Data Retention Period
              </label>
              <select
                name="dataRetention"
                value={settings.dataRetention}
                onChange={handleSelectChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22529F] text-sm sm:text-base text-black"
              >
                <option value="30days">30 days</option>
                <option value="90days">90 days</option>
                <option value="180days">180 days</option>
                <option value="1year">1 year</option>
                <option value="forever">Forever</option>
              </select>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                How long to keep your search history and archived records
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm sm:text-base">
                Clear All Data
              </button>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                Permanently delete all your data from this application
              </p>
            </div>
          </div>

          {/* Save Notice */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-8">
            <p className="text-xs sm:text-sm text-[#00377c]">
              ✓ Your settings are saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
