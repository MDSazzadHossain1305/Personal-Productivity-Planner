import { useState } from 'react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
 
function Message({ msg }) {
  if (!msg) return null;
  return (
    <p className={`rounded p-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.text}
    </p>
  );
}
 
export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user.name || '',
    phone: user.phone || '',
    bio: user.bio || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState(null); // { type, text }
  const [pwMsg, setPwMsg] = useState(null);
 
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', profile);
      setUser(data.user);
      setProfileMsg({ type: 'ok', text: 'Profile updated' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: getError(err) });
    }
  };
 
  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setPwMsg({ type: 'error', text: 'Passwords do not match' });
    try {
      await api.put('/auth/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg({ type: 'ok', text: 'Password changed' });
    } catch (err) {
      setPwMsg({ type: 'error', text: getError(err) });
    }
  };
 
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">My profile</h2>
 
      <div className="card text-sm">
        <h3 className="mb-2 font-semibold">Account information</h3>
        <p><span className="text-slate-500">Email:</span> {user.email}</p>
        <p><span className="text-slate-500">Member since:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
 
      <form onSubmit={saveProfile} className="card space-y-4">
        <h3 className="font-semibold">Edit profile</h3>
        <Message msg={profileMsg} />
        <div>
          <label className="label">Name</label>
          <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows="3" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        </div>
        <button className="btn-primary">Save profile</button>
      </form>
 
      <form onSubmit={changePassword} className="card space-y-4">
        <h3 className="font-semibold">Change password</h3>
        <Message msg={pwMsg} />
        <div>
          <label className="label">Current password</label>
          <input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
        </div>
        <button className="btn-primary">Change password</button>
      </form>
    </div>
  );
}
