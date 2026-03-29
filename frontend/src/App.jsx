import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './commoncomponents/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login/index';
import DashboardPage from './pages/dashboard/index';
import ProjectsPage from './pages/projects/index';
import ProjectDetailPage from './pages/projects/detail';
import ProjectFormPage from './pages/projects/form';
import DivisionsPage from './pages/divisions/index';
import InitiativesPage from './pages/initiatives/index';
import DeliveryPathsPage from './pages/deliveryPaths/index';
import UsersPage from './pages/users/index';
import SettingsPage from './pages/settings/index';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/divisions" element={<DivisionsPage />} />
        <Route path="/initiatives" element={<InitiativesPage />} />
        <Route path="/delivery-paths" element={<DeliveryPathsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
