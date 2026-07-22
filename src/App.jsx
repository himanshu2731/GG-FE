import { Navigate, Route, Routes } from 'react-router-dom'
import DocumentSign from './pages/DocumentSign'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SuperUserDashboard from './pages/SuperUserDashboard'
import UserDashboard from './pages/UserDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/super-user" element={<SuperUserDashboard />} />
      <Route path="/user" element={<UserDashboard />} />
      <Route path="/documents/:id" element={<DocumentSign />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
