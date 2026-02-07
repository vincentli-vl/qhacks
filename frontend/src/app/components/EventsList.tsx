'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Event {
  date: string
  title: string
  link: string
  agenda_html?: string
  minutes_html?: string
}

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500">Loading events...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
      
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-gray-500">No events found</p>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-3 hover:bg-gray-50 rounded transition">
              <h3 className="font-semibold text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-600">{event.date}</p>
              <div className="mt-2 flex gap-2">
                {event.agenda_html && (
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View Agenda
                  </button>
                )}
                {event.minutes_html && (
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View Minutes
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}