import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/axios';
 
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label">Full name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Password (min 6 characters)</label>
          <input className="input" type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" name="confirm" value={form.confirm} onChange={handleChange} required />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating...' : 'Register'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}

