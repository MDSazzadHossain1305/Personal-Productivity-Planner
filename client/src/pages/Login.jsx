import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/axios';
 
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
 
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };
 
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Log in</h1>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-slate-600">
          No account yet?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
