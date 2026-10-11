import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Notes from './pages/Notes'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
 
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
 
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
 
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
