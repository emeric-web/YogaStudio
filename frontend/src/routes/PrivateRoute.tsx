import { Navigate, Outlet } from 'react-router-dom';
import type { ReactElement } from 'react';
import { authService } from '../services/auth.service';

function PrivateRoute(): ReactElement {
  return authService.isAuthenticated()
    ? <Outlet />
    : <Navigate to="/login" replace />;
}

export default PrivateRoute;