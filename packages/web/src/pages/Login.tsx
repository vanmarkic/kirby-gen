/**
 * Login page
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import '../styles/login.css';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      await login(password);
      navigate('/');
    } catch (err: unknown) {
      // Extract error message from axios error structure
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Login failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Kirby-Gen</h1>
        <p className="subtitle">Development Access</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
