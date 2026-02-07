import React from 'react'
import Dashboard from '../components/Dashboard'
import Chatbot from '../components/Chatbot'
import './Home.css'

function Home() {
  return (
    <div className="home">
      <div className="home-container">
        <Dashboard />
        <Chatbot />
      </div>
    </div>
  )
}

export default Home
