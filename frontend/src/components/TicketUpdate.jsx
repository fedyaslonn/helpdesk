import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { getTicketDetails, updateTicket } from "../services/ticket-management-api" // ✅ Исправлен импорт
import "../styles/TicketUpdate.css"

const EditTicket = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [ticket, setTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  // ✅ Убрали title, оставили только реально существующее поле description
  const [formData, setFormData] = useState({
    description: "",
  })

  const [touched, setTouched] = useState({
    description: false,
  })

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // ✅ Используем правильную функцию getTicketDetails
        const response = await getTicketDetails(id)
        const ticketData = response.data

        setTicket(ticketData)
        setFormData({
          description: ticketData.description || "",
        })
      } catch (err) {
        console.error("Error loading ticket:", err)
        setError({
          type: "server_error",
          title: "Ошибка загрузки",
          message: "Не удалось загрузить данные заявки.",
          icon: "❌",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchTicket()
    }
  }, [id])

  const validateField = (name, value) => {
    if (name === "description") {
      if (!value.trim()) return "Описание обязательно"
      if (value.length < 8) return "Описание должно быть не короче 8 символов"
    }
    return ""
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateForm = () => {
    const newErrors = {
      description: validateField("description", formData.description)
    }
    
    // Если есть хоть одна строка с ошибкой
    const hasErrors = Object.values(newErrors).some(err => err !== "")
    
    if (hasErrors) {
      setFormErrors(newErrors)
      setTouched({ description: true })
      return false
    }
    return true
  }

  const canEditTicket = () => {
    if (!ticket || !user) return false
    // ✅ Только автор (requestor/user) может редактировать описание
    return ticket.user === user.id || ticket.user?.id === user.id
  }

  const hasChanges = () => {
    if (!ticket) return false
    return formData.description !== ticket.description
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!hasChanges()) {
      navigate(`/helpdesk/tickets/${id}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // ✅ Отправляем PATCH запрос только с измененным описанием
      await updateTicket(id, { description: formData.description })
      navigate(`/helpdesk/tickets/${id}`)
    } catch (err) {
      setIsSubmitting(false)
      setError({
        type: "server_error",
        title: "Ошибка сохранения",
        message: "Не удалось обновить заявку.",
        icon: "❌",
      })
    }
  }

  const handleCancel = () => {
    navigate(`/helpdesk/tickets/${id}`)
  }

  if (isLoading) {
    return <div className="edit-ticket-container"><div className="loading-spinner">Загрузка...</div></div>
  }

  if (error) {
    return (
      <div className="edit-ticket-container">
        <div className="error-message">
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <button className="btn btn-primary" onClick={() => navigate("/helpdesk/tickets")}>Назад к заявкам</button>
        </div>
      </div>
    )
  }

  if (!canEditTicket()) {
    return (
      <div className="edit-ticket-container">
        <div className="error-message">
          <h3>Нет доступа</h3>
          <p>Только автор может редактировать эту заявку.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/helpdesk/tickets/${id}`)}>Вернуться к заявке</button>
        </div>
      </div>
    )
  }

  return (
    <div className="edit-ticket-container">
      <div className="edit-header">
        <h1>Редактирование заявки #{ticket.ticket_number}</h1>
      </div>

      <div className="edit-form-card">
        <form onSubmit={handleSubmit} className="edit-form">
          
          <div className="form-group">
            <label htmlFor="description">
              Описание проблемы
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-control ${formErrors.description ? "is-invalid" : ""}`}
              placeholder="Подробно опишите проблему..."
              disabled={isSubmitting}
              rows={8}
            />
            {formErrors.description && (
              <span className="field-error-inline">{formErrors.description}</span>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={isSubmitting}>
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !hasChanges()}
            >
              {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTicket
