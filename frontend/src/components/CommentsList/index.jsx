import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/",
  headers: { "Content-Type": "application/json" },
});

function CommentsList() {
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComments = () => {
      setIsLoading(true);
      api
        .get("/comments/comments_list/")
        .then(({ data }) => {
          setComments(data);
          setError(null);
        })
        .catch(() => {
          setError("Failed to load comments");
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    fetchComments();
  }, []);

  if (error) return <div className="error-message">{error}</div>;
  if (isLoading) return <div className="loading">Loading...</div>;
  if (comments.length === 0)
    return <div className="no-data">No comments found</div>;

  return (
    <div className="users-container">
      <h1>Comments List</h1>

      <div className="comments-table">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-row">
            <div className="comment-info">
              <div className="comment-author">
                <strong>Author:</strong> {comment.author?.username || "Unknown"}
              </div>
              <div className="comment-text">
                <strong>Text:</strong> {comment.text}
              </div>
            </div>

            <div className="comment-status">
              <strong>Status:</strong>{" "}
              {comment.is_responsed ? (
                <span className="status-responded">Responded</span>
              ) : (
                <span className="status-not-responded">Not Responded</span>
              )}
            </div>

            <div className="comment-timestamps">
              <div className="created-at">
                <strong>Created At:</strong>{" "}
                {new Date(comment.created_at).toLocaleString()}
              </div>
              <div className="updated-at">
                <strong>Updated At:</strong>{" "}
                {new Date(comment.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CommentsList
