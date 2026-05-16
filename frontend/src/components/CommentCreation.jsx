import { useState } from "react"
import axios from "axios"
import { serverApi } from '../contants'
import '../styles/SignUpPage.css'

function CreateComment() {
  const [text, setText] = useState("")
  const [authorId, setAuthorId] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    axios
      .post(`${serverApi}/comments/comments_list/`, { text, author_id: authorId })
      .then(() => {
        alert("Comment created successfully!")
        setText("")
        setAuthorId("")
        setError("")
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.error || "Something went wrong";
        setError(errorMessage)
      })
  }

  return (
    <div className="create-user-container">
      <h2>Create Comment</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Author ID:</label>
          <input
            type="number"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Comment Text:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="button">
          Create Comment
        </button>
      </form>
    </div>
  )
}

export default CreateComment
