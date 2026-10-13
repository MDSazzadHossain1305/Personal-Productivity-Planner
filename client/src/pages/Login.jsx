import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/axios';
import AuthLayout from '../components/AuthLayout';

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
    <AuthLayout title="Welcome back" subtitle="Log in to continue to Kaajkormo.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" name="email" autoComplete="email"
            value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" name="password" autoComplete="current-password"
            value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-slate-600">
          New to Kaajkormo?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}