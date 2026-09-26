import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../common/Spinner'

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-indigo-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/interviews" replace />
  }

  return <Outlet />
}
