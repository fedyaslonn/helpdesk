import { useEffect, useState } from "react"
import axios from "axios"
import "../styles/UsersList.css"
import { getUsers } from "../services/user-management-api"
import { serverApi } from "../contants"
import "../styles/Filters.css"

const api = axios.create({
  baseURL: `${serverApi}`,
  headers: { "Content-Type": "application/json" },
})

function UsersList() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // Filter states
  const [selectedFilter, setSelectedFilter] = useState("all") // 'all', 'my-org', 'other-orgs', 'no-org'

  // Filter options
  const getFilterOptions = () => {
    const baseOptions = [
      {
        value: "all",
        label: "All Users",
        className: "filter-all",
        icon: "👥",
        description: "Show all users in the system",
      },
    ]

    if (currentUser?.organization) {
      baseOptions.push(
        {
          value: "my-org",
          label: `${currentUser.organization.name} Members`,
          className: "filter-my-org",
          icon: "🏢",
          description: `Users from your organization: ${currentUser.organization.name}`,
        },
        {
          value: "other-orgs",
          label: "Other Organizations",
          className: "filter-other-orgs",
          icon: "🏛️",
          description: "Users from other organizations",
        },
      )
    }

    baseOptions.push({
      value: "no-org",
      label: "Without Organization",
      className: "filter-no-org",
      icon: "👤",
      description: "Users who don't belong to any organization",
    })

    return baseOptions
  }

  // Загрузка данных текущего пользователя
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/users/me/")
        setCurrentUser(response.data)
        // Если у пользователя есть организация, по умолчанию показываем только её членов
        if (response.data?.organization) {
          setSelectedFilter("my-org")
        }
      } catch (error) {
        console.error("Failed to load current user", error)
        setCurrentUser(null)
      }
    }

    fetchCurrentUser()
  }, [])

  // Загрузка списка пользователей с фильтрацией
  useEffect(() => {
    const fetchUsers = () => {
      setIsLoading(true)

      getUsers()
        .then(({ data }) => {
          console.log("API Response:", data)
          setUsers(Array.isArray(data) ? data : [])
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

  // Фильтрация пользователей на клиенте
  const getFilteredUsers = () => {
    if (!Array.isArray(users)) return []

    switch (selectedFilter) {
      case "my-org":
        return currentUser?.organization
          ? users.filter((user) => user.organization?.id === currentUser.organization.id)
          : []

      case "other-orgs":
        return currentUser?.organization
          ? users.filter((user) => user.organization && user.organization.id !== currentUser.organization.id)
          : users.filter((user) => user.organization)

      case "no-org":
        return users.filter((user) => !user.organization)

      default: // 'all'
        return users
    }
  }

  const handleFilterChange = (filterValue) => {
    setSelectedFilter(filterValue)
  }

  const clearFilter = () => {
    setSelectedFilter("all")
  }

  const filteredUsers = getFilteredUsers()
  const filterOptions = getFilterOptions()

  if (error) {
    return (
      <div className="users-container">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Users</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="users-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="users-container">
      <div className="page-header">
        <h1 className="page-title">Users List</h1>
        {currentUser?.organization && (
          <div className="header-info">
            <span className="organization-badge">
              <svg className="org-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {currentUser.organization.name}
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <div className="filters-title">
            <svg className="filters-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
              />
            </svg>
            Filter Users
            {selectedFilter !== "all" && <span className="active-filters-badge">1 active</span>}
          </div>
          {selectedFilter !== "all" && (
            <button className="clear-filters-btn" onClick={clearFilter}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filter
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-group-label">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            Organization Filter
          </div>
          <div className="filter-buttons-container">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`filter-btn user-filter-btn ${option.className} ${
                  selectedFilter === option.value ? "selected" : ""
                }`}
                onClick={() => handleFilterChange(option.value)}
                title={option.description}
              >
                <span className="filter-icon">{option.icon}</span>
                {option.label}
                {selectedFilter === option.value && (
                  <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <div className="results-count">
          <span className="count-number">{filteredUsers.length}</span>
          <span className="count-text">
            {filteredUsers.length === 1 ? "user found" : "users found"}
            {selectedFilter !== "all" && (
              <span className="filter-applied">
                {" "}
                • {filterOptions.find((opt) => opt.value === selectedFilter)?.label}
              </span>
            )}
          </span>
        </div>
        {selectedFilter === "my-org" && currentUser?.organization && (
          <div className="filter-info">
            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Showing members of your organization: <strong>{currentUser.organization.name}</strong>
          </div>
        )}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {selectedFilter === "my-org"
              ? "🏢"
              : selectedFilter === "other-orgs"
                ? "🏛️"
                : selectedFilter === "no-org"
                  ? "👤"
                  : "👥"}
          </div>
          <h3>No Users Found</h3>
          <p>
            {selectedFilter === "my-org"
              ? "No users found in your organization."
              : selectedFilter === "other-orgs"
                ? "No users found in other organizations."
                : selectedFilter === "no-org"
                  ? "All users belong to organizations."
                  : "No users found in the system."}
          </p>
          {selectedFilter !== "all" && (
            <button className="btn btn-secondary" onClick={clearFilter}>
              Show All Users
            </button>
          )}
        </div>
      ) : (
        <div className="users-table">
          {filteredUsers.map((user) => (
            <div key={user.id} className="user-row">
              <div className="user-info">
                <div className="avatar">{user.username ? user.username[0].toUpperCase() : "?"}</div>
                <div className="user-details">
                  <div className="username">{user.username || "Unknown User"}</div>
                  <div className="email">{user.email || "No email provided"}</div>
                </div>
              </div>

              <div className="organizations">
                {user.organization ? (
                  <div className="org-info">
                    <span
                      className={`org-tag has-org ${
                        currentUser?.organization && user.organization.id === currentUser.organization.id
                          ? "same-org"
                          : "different-org"
                      }`}
                    >
                      <svg className="org-tag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      {user.organization.name}
                    </span>
                    {currentUser?.organization && user.organization.id === currentUser.organization.id && (
                      <span className="same-org-indicator">Your Organization</span>
                    )}
                  </div>
                ) : (
                  <span className="org-tag no-org">
                    <svg className="org-tag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    No organization
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UsersList
