import { useState, useEffect } from "react";
import '../styles/UserProfile.css';
import { getCurrentUser, updatePassword, updateUser } from '../services/user-management-api';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    password: "",
    password2: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getCurrentUser();
        console.log("API Response:", response);
        if (response.data && typeof response.data === 'object') {
          const userData = response.data;
          setUser(userData);
          setEditForm({
            email: userData.email || "",
            username: userData.username || "",
            first_name: userData.first_name || "",
            last_name: userData.last_name || ""
          });
        } else {
          throw new Error("Invalid user data format");
        }
      } catch (err) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

const handleEditSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");

  if (!user) return;

  try {
    const changes = {};

    if (editForm.email !== user.email) changes.email = editForm.email;
    if (editForm.username !== user.username) changes.username = editForm.username;
    if (editForm.first_name !== user.first_name) changes.first_name = editForm.first_name;
    if (editForm.last_name !== user.last_name) changes.last_name = editForm.last_name;

    if (Object.keys(changes).length === 0) {
      setSuccess("No changes detected");
      setIsEditing(false);
      return;
    }

    const response = await updateUser(user.id, changes);

    setUser({
      ...user,
      ...response.data
    });

    setSuccess("Profile updated successfully!");
    setIsEditing(false);
  } catch (err) {
    setError(err.response?.data?.error || err.message || "Update failed");
  }
};
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) return;

    try {
      await updatePassword(user.id, passwordForm);
      setSuccess("Password updated successfully!");
      setPasswordForm({
        old_password: "",
        password: "",
        password2: ""
      });
      setIsChangingPassword(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Password update failed");
    }
  };

  if (loading) return <div className="loading">Loading user data...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!user) return <div className="error">User not found</div>;

  const formatLastLogin = (dateString) => {
    if (!dateString) return "Never logged in";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderOrganization = () => {
    if (!user.organization) return "None";

    if (typeof user.organization === 'string') {
      return user.organization;
    }

    if (user.organization && typeof user.organization === 'object') {
      return user.organization.name || "No name";
    }

    return "Invalid format";
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>User Profile</h2>
      </div>

      {!isEditing && !isChangingPassword && (
        <div className="profile-details">
          <div className="detail-item">
            <strong>Username:</strong> {user.username}
          </div>
          <div className="detail-item">
            <strong>Email:</strong> {user.email}
          </div>
          <div className="detail-item">
            <strong>First Name:</strong> {user.first_name || "Not specified"}
          </div>
          <div className="detail-item">
            <strong>Last Name:</strong> {user.last_name || "Not specified"}
          </div>
          <div className="detail-item">
            <strong>Last Login:</strong> {formatLastLogin(user.last_login)}
          </div>
          <div className="detail-item">
            <strong>Organization:</strong>
            {user.organization ? user.organization.name : "None"}
          </div>

          <div className="profile-actions">
            <button
              className="btn-edit"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
            <button
              className="btn-change-password"
              onClick={() => setIsChangingPassword(true)}
            >
              Change Password
            </button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="edit-form">
          <h3>Edit Profile</h3>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
              />
            </div>

            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={editForm.username}
                onChange={handleEditChange}
              />
            </div>

            <div className="form-group">
              <label>First Name:</label>
              <input
                type="text"
                name="first_name"
                value={editForm.first_name}
                onChange={handleEditChange}
                placeholder="Not specified"
              />
            </div>

            <div className="form-group">
              <label>Last Name:</label>
              <input
                type="text"
                name="last_name"
                value={editForm.last_name}
                onChange={handleEditChange}
                placeholder="Not specified"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-save">
                Save Changes
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isChangingPassword && (
        <div className="password-form">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password:</label>
              <input
                type="password"
                name="old_password"
                value={passwordForm.old_password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                name="password"
                value={passwordForm.password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password:</label>
              <input
                type="password"
                name="password2"
                value={passwordForm.password2}
                onChange={handlePasswordChange}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-save">
                Change Password
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsChangingPassword(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
