import React, { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    avgResponseTime: 0
  })

  useEffect(() => {
    // Fetch stats from backend
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="timestamp">{new Date().toLocaleDateString()}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{stats.activeUsers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Messages</div>
          <div className="stat-value">{stats.totalMessages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Response Time</div>
          <div className="stat-value">{stats.avgResponseTime}ms</div>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="section">
          <h2>Welcome</h2>
          <p>Welcome to your dashboard. Use the chatbot on the right to ask questions or get assistance.</p>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
