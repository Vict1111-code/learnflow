import { Navigate } from 'react-router-dom';

// Legacy /auth route -> redirect to new /login page.
export default function Auth() {
  return <Navigate to="/login" replace />;
}
