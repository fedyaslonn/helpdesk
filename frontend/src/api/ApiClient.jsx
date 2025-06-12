import axios from 'axios'
import { serverApi } from '../contants'


console.log('serverApi:', serverApi);

const apiClientInstance = axios.create({
  baseURL: `${serverApi}/authentication/`,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClientInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && !config.url.includes('/token/refresh/')) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config;
  },
  (error) => Promise.reject(error),
)

apiClientInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes('/token/') &&
        !originalRequest.url.includes('/login/')) {

      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token available')

        const response = await axios.post(
          `${serverApi}/api/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access, user_id, email } = response.data

        localStorage.setItem('access_token', access)
        if (response.data.refresh) {
          localStorage.setItem('refresh_token', response.data.refresh)
        }
        localStorage.setItem('user_id', user_id)
        localStorage.setItem('email', email)


        originalRequest.headers.Authorization = `Bearer ${access}`
        return apiClientInstance(originalRequest)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)


        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('email')


        if (window.location.pathname !== '/login') {
          window.location.href = '/login?session_expired=true';
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
);

const apiClient = {
  login: async (username, password) => {
    const response = await apiClientInstance.post('/api/token/', { username, password });
    const { access, refresh, user_id, email } = response.data


    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user_id', user_id)
    localStorage.setItem('email', email)

    return {
      access,
      refresh,
      user: { id: user_id, email },
    }
  },

  checkAuth: async () => {
    try {

      if (!localStorage.getItem('access_token')) {
        return { user: null };
      }

      const response = await apiClientInstance.get('/api/token/check_auth/');
      return response.data;
    } catch (error) {
      console.error('Authentication check failed:', error)
      return { user: null };
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await apiClientInstance.post('/logout/', { refresh_token: refreshToken })
      }
    } finally {

      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('email')
    }
  },
}

export default apiClient
