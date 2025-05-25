import { useState } from "react";
import axios from "axios";

function CreateUser() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post("http://localhost:8000/users/users_list/", {
      email,
      username,
      password,
      password2
    })
    .then(() => {
      alert("User created!");
      setEmail("");
      setUsername("");
      setPassword("");
      setPassword2("");
      setError("");
    })
    .catch(err => {
      setError("Error: " + err.message);
    });
  };

return (
  <div className="create-user-container">
    <h2>Create User</h2>
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Confirm Password:</label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="button">
        Create User
      </button>
    </form>
  </div>
);
}

export default CreateUser;
