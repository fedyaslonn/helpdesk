import { useEffect, useState } from "react"
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8000/",
  headers: { "Content-Type": "application/json" },
})

function UsersList() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = () => {
      setIsLoading(true)
      api
        .get("/users/users_list/")
        .then(({ data }) => {
          setUsers(data)
          setError(null)
        })
        .catch(() => {
          setError("Failed to load users")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }

    fetchUsers()
  }, [])

  if (error) return <div>{error}</div>
  if (isLoading) return <div>Loading...</div>
  if (users.length === 0) return <div>Users not found</div>

  return (
    <div className="users-container">
      <h1 className="page-title">Users list</h1>

      <div className="users-table">

        {users.map((user) => (
          <div key={user.id} className="user-row">
            <div className="user-info">
              <div className="avatar">
                {user.username[0].toUpperCase()}
              </div>
              <div className="username">{user.username}</div>
            </div>

            <div className="email">{user.email}</div>

            <div className="organizations">
              {user.organizations?.length > 0 ? (
                user.organizations.map((org) => (
                  <span key={org.id} className="org-tag">
                    {org.name}
                  </span>
                ))
              ) : (
                <span className="no-org">No organizations</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UsersList
