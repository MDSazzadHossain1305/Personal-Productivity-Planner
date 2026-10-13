import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start planning with Kaajkormo. It takes 30 seconds.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" name="name" autoComplete="name"
            value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" name="email" autoComplete="email"
            value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (min 6 characters)</label>
          <input id="password" className="input" type="password" name="password" autoComplete="new-password"
            value={form.password} onChange={handleChange} required />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input id="confirm" className="input" type="password" name="confirm" autoComplete="new-password"
            value={form.confirm} onChange={handleChange} required />
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}