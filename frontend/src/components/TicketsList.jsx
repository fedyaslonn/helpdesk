import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'
import axios from "axios"
import '../styles/TicketsPage.css';
import LogoutButton from '../auth/Logout.jsx'

const TicketsPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)


  const groupedTickets = {
    UNASSIGNED: tickets.filter(ticket =>
      ticket.status === "OP" && !ticket.assignee
    ),
    OPEN: tickets.filter(ticket =>
      ticket.status === "IP" || (ticket.status === "OP" && ticket.assignee)
    ),
    WAITING: tickets.filter(ticket =>
      ticket.status === "WR"
    ),
    RESOLVED: tickets.filter(ticket =>
      ticket.status === "RS"
    ),
  }


  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('http://localhost:8000/helpdesk/tickets/tickets_list/')
        setTickets(response.data)
      } catch (err) {
        setError('Не удалось загрузить тикеты')
        console.error('Ошибка загрузки тикетов:', err)
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchTickets()
    }
  }, [isAuthenticated])


   const renderTicketCard = (ticket) => (
    <div key={ticket.id} className="ticket-card">
      <div className="ticket-header">
      </div>
      <h3 className="ticket-title">{ticket.title}</h3>
      <p className="ticket-description">
        {ticket.description.length > 100 ? `${ticket.description.substring(0, 100)}...` : ticket.description}
      </p>
      <div className="ticket-meta">
        <div className="ticket-users">
          <div className="ticket-user">
            <span className="label">Requestor:</span>
            <span className="value">{ticket.requestor.username}</span>
          </div>
          <div className="ticket-user">
            <span className="label">Agent:</span>
            <span className="value">{ticket.assignee ? ticket.assignee.username : 'Unassigned'}</span>
          </div>
        </div>
      </div>
      <div className="ticket-footer">
        <Link
          to={`/helpdesk/tickets/${ticket.id}`}
          className="btn btn-primary btn-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  )

  const renderTicketSection = (title, tickets) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-gray-200">
        {title} <span className="text-secondary">({tickets.length})</span>
      </h2>

      <div className="tickets-container">
        {tickets.length > 0 ? (
          tickets.map(renderTicketCard)
        ) : (
          <p className="text-gray-500 italic">No tickets found</p>
        )}
      </div>
      </div>
  )

  if (isLoading) {
    return (
      <div className="app-container">
        <main className="main-content">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <main className="main-content">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </main>
      </div>
    )
  }

  return (
        <main className="main-content">
          <div className="page-header">
            <h2>All Tickets</h2>
            <div className="flex items-center gap-2">
              <button className="btn btn-primary">
                + New Ticket
              </button>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {renderTicketSection("Unassigned Tickets", groupedTickets.UNASSIGNED)}
              {renderTicketSection("Open Tickets", groupedTickets.OPEN)}
            </div>
            <div>
              {renderTicketSection("Waiting for Response", groupedTickets.WAITING)}
              {renderTicketSection("Resolved Tickets", groupedTickets.RESOLVED)}
            </div>
          </div>
        </main>
  )
}

export default TicketsPage
