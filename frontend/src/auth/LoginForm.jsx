import { useState } from "react"
import { Button, Form, Input, message } from "antd"
import { useAuth } from "../auth/AuthContext"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import "../styles/LoginForm.css"

export default function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()


const onFinish = async (values) => {
  setLoading(true)
  try {
    await login(values.username, values.password)
    messageApi.success("Logged in successfully")
    navigate("/helpdesk/tickets/")
  } catch (error) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('email')

  } finally {
    setLoading(false)
  }
}

  return (
    <div className="login-page">
      {contextHolder}
      <div className="login-container">
        <h2 className="login-title">Login</h2>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          className="login-form"
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              disabled={loading}
              className="login-button"
            >
              Log in
            </Button>
          </Form.Item>

          <div className="signup-link">
            <Link to="/signup">Create an account</Link>
          </div>
        </Form>
      </div>
    </div>
  )
}
