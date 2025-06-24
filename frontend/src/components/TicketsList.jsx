import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import '../styles/TicketsPage.css'
import '../styles/Filters.css'
import { apiClientInstance } from '../api/ApiClient'

const TicketsPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialStatusFilter = searchParams.get('status') || null
  const initialAssigneeFilter = searchParams.get('assignee') || null

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter)
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssigneeFilter)

  const clearFilters = () => {
    setStatusFilter(null)
    setAssigneeFilter(null)
    setSearchParams({})
  }

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        if (statusFilter) params.append('status', statusFilter)
        if (assigneeFilter) params.append('assignee', assigneeFilter)
        const response = await apiClientInstance.get(`/helpdesk/tickets/tickets_list/?${params.toString()}`)
        setTickets(response.data)
      } catch (err) {
        setError('Не удалось загрузить тикеты')
        console.error('Ошибка загрузки тикетов:', err)
      } finally {
        setIsLoading(false)
      }
    };

    if (isAuthenticated) {
      fetchTickets()
    }
  }, [isAuthenticated, statusFilter, assigneeFilter])


  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = !statusFilter || ticket.status === statusFilter
    const matchesAssignee = !assigneeFilter ||
      (ticket.assignee && ticket.assignee.username === assigneeFilter)
    return matchesStatus && matchesAssignee
  })


  const groupedTickets = {

    MY_REQUESTS: filteredTickets.filter(ticket =>
      ticket.requestor && user && ticket.requestor.id === user.id
    ),


    ORGANIZATION: filteredTickets.filter(ticket =>
      ticket.organization &&
      user?.organization &&
      ticket.organization.id === user.organization.id &&
      ticket.requestor.id !== user.id
    ),

    ASSIGNED_TO_ME: filteredTickets.filter(ticket =>
      ticket.assignee && user && ticket.assignee.id === user.id
    )
  }


  const renderTicketCard = (ticket) => (
    <div key={ticket.id} className="ticket-card">
      <div className="ticket-header">
        <span className={`ticket-status ${ticket.status.toLowerCase()}`}>
          {ticket.status === 'OP' && 'Open'}
          {ticket.status === 'IP' && 'In Progress'}
          {ticket.status === 'WR' && 'Waiting'}
          {ticket.status === 'RS' && 'Resolved'}
        </span>
      </div>
      <h3 className="ticket-title">{ticket.title}</h3>
      <p className="ticket-description">
        {ticket.description.length > 100 ?
          `${ticket.description.substring(0, 100)}...`
          : ticket.description}
      </p>
      <div className="ticket-meta">
        <div className="ticket-users">
          <div className="ticket-user">
            <span className="label">From:</span>
            <span className="value">{ticket.requestor.username}</span>
          </div>
          <div className="ticket-user">
            <span className="label">Assignee:</span>
            <span className="value">
              {ticket.assignee ? ticket.assignee.username : 'Unassigned'}
            </span>
          </div>
        </div>
        <div className="ticket-date">
          Created: {new Date(ticket.created_at).toLocaleDateString()}
        </div>
      </div>
      <div className="ticket-footer">
        <Link to={`/helpdesk/tickets/${ticket.id}`} className="btn btn-primary btn-sm">
          View Details
        </Link>
      </div>
    </div>
  )


  const renderTicketSection = (title, tickets) => (
    <div className="ticket-section">
      <h2 className="section-title">
        {title} <span className="ticket-count">({tickets.length})</span>
      </h2>
      <div className="tickets-list">
        {tickets.length > 0 ? (
          tickets.map(renderTicketCard)
        ) : (
          <p className="no-tickets">No tickets in this category</p>
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
      <div className="filters-section">
        <div className="filters-header">
          <div className="filters-title">
            <svg xmlns="http://www.w3.org/2000/svg" className="filters-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters</span>
            {(statusFilter || assigneeFilter) && (
              <span className="active-filters-badge">{[statusFilter, assigneeFilter].filter(Boolean).length}</span>
            )}
          </div>
          {(statusFilter || assigneeFilter) && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>

        <div className="filter-group">
          <label className="filter-group-label">Status</label>
          <div className="filter-buttons-container">
            {['OP', 'IP', 'RS', 'WR'].map((status) => (
              <button
                key={status}
                className={`filter-btn status-${status.toLowerCase()} ${statusFilter === status ? 'selected' : ''}`}
                onClick={() => {
                  const newStatus = statusFilter === status ? null : status;
                  setStatusFilter(newStatus);
                  setSearchParams((prev) => {
                    if (newStatus) prev.set('status', newStatus);
                    else prev.delete('status');
                    return prev;
                  });
                }}
              >
                {status === 'OP' && 'Open'}
                {status === 'IP' && 'In Progress'}
                {status === 'RS' && 'Resolved'}
                {status === 'WR' && 'Waiting'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-group-label">Assignee</label>
          <div className="filter-buttons-container">
            {Array.from(new Set(tickets.map((t) => t.assignee?.username).filter(Boolean)))
              .slice(0, 5)
              .map((username) => (
                <button
                  key={username}
                  className={`filter-btn assignee ${assigneeFilter === username ? 'selected' : ''}`}
                  onClick={() => {
                    const newAssignee = assigneeFilter === username ? null : username;
                    setAssigneeFilter(newAssignee);
                    setSearchParams((prev) => {
                      if (newAssignee) prev.set('assignee', newAssignee);
                      else prev.delete('assignee');
                      return prev;
                    });
                  }}
                >
                  {username}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="page-header">
        <h2>My Tickets</h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={() => navigate('/helpdesk/tickets/create')}>
            + New Ticket
          </button>
        </div>
      </div>

      <div className="tickets-grid">
        {renderTicketSection("My Requests", groupedTickets.MY_REQUESTS)}
        {renderTicketSection("Organization Tickets", groupedTickets.ORGANIZATION)}
        {renderTicketSection("Assigned to Me", groupedTickets.ASSIGNED_TO_ME)}
      </div>
    </main>
  )
}

export default TicketsPage