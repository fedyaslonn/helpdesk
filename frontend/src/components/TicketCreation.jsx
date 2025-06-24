import React, { useState, useEffect } from 'react'
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from 'react-router-dom'
import { getOrganizations, getUsers, createTicket } from '../services/ticket-management-api'
import '../styles/TicketsPage.css'
import { serverApi } from '../contants'

const TicketCreateForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState([])
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    organization: '',
    status: 'OP'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orgsResponse = await getOrganizations()
        setOrganizations(orgsResponse.data);

        const usersResponse = await getUsers()
        setUsers(usersResponse.data);

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load required data')
        console.error('Data load error:', err)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true)
    try {
      const ticketData = {
        ...formData,
        requestor: user.id,
        assignee: formData.assignee ? parseInt(formData.assignee) : null,
        organization: parseInt(formData.organization)
      };
            await createTicket(ticketData)
      navigate('/helpdesk/tickets')
    } catch (err) {
      setError('Failed to create ticket')
      console.error('Ticket creation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      'OP': 'Открыт',
      'IP': 'В работе',
      'RS': 'Решено',
      'WR': 'Ожидает ответа'
    };
    return statusMap[status] || status
  };

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="ticket-form-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <div className="ticket-form-card">
              <div className="ticket-form-header">
                <div className="header-icon">
                  <i className="bi bi-ticket-perforated fs-3"></i>
                </div>
                <h1 className="header-title">Create new ticket</h1>
                <p className="header-subtitle mb-0">Submit a support request</p>
              </div>
              <div className="ticket-form-body">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-group-enhanced">
                    <label htmlFor="title" className="form-label-enhanced">
                      <i className="bi bi-card-heading"></i>
                      Ticket's title
                      <span className="required-asterisk">*</span>
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control form-control-enhanced form-control-lg-enhanced"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Describe your problem briefly"
                        maxLength={52}
                        required
                      />
                      <div className="char-counter">
                        {formData.title.length}/52
                      </div>
                    </div>
                  </div>
                  <div className="form-group-enhanced">
                    <label htmlFor="organization" className="form-label-enhanced">
                      <i className="bi bi-building"></i>
                      Organization
                      <span className="required-asterisk">*</span>
                    </label>
                    <select
                      className="form-select form-select-enhanced"
                      id="organization"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      required
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-enhanced">
                    <label htmlFor="description" className="form-label-enhanced">
                      <i className="bi bi-card-text"></i>
                      Problem description
                      <span className="required-asterisk">*</span>
                    </label>
                    <textarea
                      className="form-control form-control-enhanced form-textarea-enhanced"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Please describe your problem in details..."
                      required
                    ></textarea>
                  </div>
                  <div className="form-section-divider"></div>
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-submit-enhanced"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading-spinner me-2"></span>
                          Ticket creation...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Create ticket
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketCreateForm
