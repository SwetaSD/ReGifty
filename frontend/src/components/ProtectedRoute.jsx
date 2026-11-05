import { Navigate } from "react-router-dom";

function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return <p>Checking your login session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;