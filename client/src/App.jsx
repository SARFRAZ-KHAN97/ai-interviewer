import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import PublicOnlyRoute from './components/auth/PublicOnlyRoute'
import Shell from './components/layout/Shell'
import AuthProvider from './context/AuthProvider'
import ToastProvider from './context/ToastProvider'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Resumes from './pages/Resumes'
import Interviews from './pages/Interviews'
import InterviewNew from './pages/InterviewNew'
import InterviewRoom from './pages/InterviewRoom'
import Report from './pages/Report'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="resumes" element={<Resumes />} />
                <Route path="interviews" element={<Interviews />} />
                <Route path="interviews/new" element={<InterviewNew />} />
                <Route path="interviews/:id" element={<InterviewRoom />} />
                <Route path="reports/:id" element={<Report />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
