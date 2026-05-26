import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { getTicketDetails, updateTicket } from "../services/ticket-management-api" // ✅ Исправлен импорт
import { PageLayout, PageHeader, ButtonGroup, LoadingState } from './ui';
import { Box, Typography, TextField, Button, Paper, Alert, Stack } from '@mui/material';

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
    return (
      <PageLayout maxWidth="max-w-xl">
        <LoadingState message="Загрузка заявки…" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout maxWidth="max-w-xl">
        <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
        <Button variant="contained" onClick={() => navigate('/helpdesk/tickets')}>Назад к заявкам</Button>
      </PageLayout>
    );
  }

  if (!canEditTicket()) {
    return (
      <PageLayout maxWidth="max-w-xl">
        <Alert severity="warning" sx={{ mb: 2 }}>Только автор может редактировать эту заявку.</Alert>
        <Button variant="contained" onClick={() => navigate(`/helpdesk/tickets/${id}`)}>Вернуться к заявке</Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="max-w-xl">
      <Paper elevation={0} className="hd-card !p-6">
        <PageHeader title={`Редактирование ${ticket.ticket_number}`} subtitle="Измените описание проблемы" />

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Описание проблемы"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={handleBlur}
              multiline
              rows={8}
              fullWidth
              required
              error={Boolean(formErrors.description)}
              helperText={formErrors.description}
              disabled={isSubmitting}
            />
            <ButtonGroup>
              <Button type="button" variant="outlined" color="inherit" onClick={handleCancel} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting || !hasChanges()}>
                {isSubmitting ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </ButtonGroup>
          </Stack>
        </Box>
      </Paper>
    </PageLayout>
  );
}

export default EditTicket
