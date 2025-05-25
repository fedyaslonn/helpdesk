import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

function UserUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    date_birth: ""
  });

  useEffect(() => {
    axios.get(`http://localhost:8000/users/${id}/`)
      .then(response => {
        setFormData({
          email: response.data.email,
          username: response.data.username,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          date_birth: response.data.date_birth
        });
        setUser(response.data);
      })
      .catch(err => {
        setError("User not found");
      });
  }, [id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.patch(`http://localhost:8000/users/${id}/`, formData)
      .then(() => {
        alert("User updated!");
        navigate("/users");
      })
      .catch(err => {
        setError("Error: " + err.message);
      });
  };

  if (!user) return <div>{error || "Loading..."}</div>;

  return (
    <div className="create-user-container">
      <h2>Update User</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>First Name:</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Last Name:</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Date of Birth:</label>
          <input
            type="date"
            name="date_birth"
            value={formData.date_birth}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Update User</button>
      </form>
    </div>
  );
}

export default UserUpdate;
