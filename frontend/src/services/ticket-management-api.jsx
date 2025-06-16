import axios from 'axios'
import { serverApi } from '../contants'

export const getOrganizations = () => {
  return axios.get(`${serverApi}/helpdesk/organizations/organizations_list/`)
}

export const getUsers = () => {
  return axios.get(`${serverApi}/helpdesk/users/users_list/`)
}

export const createTicket = (ticketData) => {
  return axios.post(`${serverApi}/helpdesk/tickets/create/`, ticketData)
}

export const getTickets = () => {
  return axios.get(`${serverApi}/helpdesk/tickets/tickets_list/`)
}
