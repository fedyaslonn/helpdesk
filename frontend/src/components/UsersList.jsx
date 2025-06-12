import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/UsersList.css";
import { createUser, getUsers } from '../services/user-management-api'
import { serverApi } from "../contants"

const api = axios.create({
  baseURL: `${serverApi}`,
  headers: { "Content-Type": "application/json" },
})

function UsersList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = () => {
      setIsLoading(true);
      getUsers().then(({ data }) => {
          console.log("API Response:", data)
          setUsers(Array.isArray(data) ? data : [])
          setError(null);
        })
        .catch(() => {
          setError("Failed to load users");
        })
        .finally(() => {
          setIsLoading(false);
        })
    }

    fetchUsers()
  }, [])

  if (error) return <div>{error}</div>;
  if (isLoading) return <div>Loading...</div>;
  if (users.length === 0) return <div>Users not found</div>;

  return (
    <div className="users-container">
      <h1 className="page-title">Users list</h1>

      <div className="users-table">
        {users.map((user) => (
          <div key={user.id} className="user-row">
            <div className="user-info">
              <div className="avatar">
                {user.username ? user.username[0].toUpperCase() : "?"}
              </div>
              <div className="username">{user.username || "Unknown User"}</div>
            </div>

            <div className="email">{user.email || "No email provided"}</div>

            <div className="organizations">
              <p>Organization</p>
              {user.organization ? (
                <span className="org-tag">{user.organization.name}</span>
              ) : (
                <span className="no-org">No organization</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UsersList
