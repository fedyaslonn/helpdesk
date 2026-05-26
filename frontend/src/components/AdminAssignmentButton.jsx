import { useState } from 'react';
import axios from 'axios';
import { serverApi } from '../contants';
import { apiClientInstance } from '../api/ApiClient';


const AdminAssignmentButton = ({ userId, organizationId, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleAssignAdmin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await assignAdmin(userId, organizationId);

      if (response.status === 200) {
        onSuccess(userId);
      }
    } catch (err) {
      console.error('Failed to assign admin role:', err);
      setError(err.response?.data?.error ||
               err.response?.data?.detail ||
               'Failed to assign admin role');
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirmation(true)}
        className="btn-assign-admin"
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Make Admin'}
      </button>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Confirm Admin Assignment</h3>
            <p>Are you sure you want to make this user an organization admin?</p>

            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmation(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignAdmin}
                className="btn-confirm"
                disabled={isLoading}
              >
                {isLoading ? 'Assigning...' : 'Confirm'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminAssignmentButton
