import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './commoncomponents/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login/index';
import DashboardPage from './pages/dashboard/index';
import ProjectsPage from './pages/projects/index';
import ProjectDetailPage from './pages/projects/detail';
import ProjectFormPage from './pages/projects/form';
import DivisionsPage from './pages/divisions/index';
import DivisionDetailPage from './pages/divisions/detail';
import BudgetsPage from './pages/budgets/index';
import BudgetDetailPage from './pages/budgets/detail';
import InitiativesPage from './pages/initiatives/index';
import InitiativeDetailPage from './pages/initiatives/detail';
import DeliveryPathsPage from './pages/deliveryPaths/index';
import DeliveryPathDetailPage from './pages/deliveryPaths/detail';
import VendorsPage from './pages/vendors/index';
import VendorDetailPage from './pages/vendors/detail';
import VendorResourceDetailPage from './pages/vendors/resourceDetail';
import UsersPage from './pages/users/index';
import UserDetailPage from './pages/users/detail';
import LogsPage from './pages/logs/index';
import ProjectRolesPage from './pages/projectRoles/index';
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
        <Route path="/divisions/:id" element={<DivisionDetailPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/budgets/:id" element={<BudgetDetailPage />} />
        <Route path="/initiatives" element={<InitiativesPage />} />
        <Route path="/initiatives/:id" element={<InitiativeDetailPage />} />
        <Route path="/delivery-paths" element={<DeliveryPathsPage />} />
        <Route path="/delivery-paths/:id" element={<DeliveryPathDetailPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/vendors/:id" element={<VendorDetailPage />} />
        <Route path="/vendors/:vendorId/resources/:resourceId" element={<VendorResourceDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/project-roles" element={<ProjectRolesPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
