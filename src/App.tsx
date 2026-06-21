import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/auth/pages/login-page';
import RegisterPage from './modules/auth/pages/register-page';
import DashboardLayout from './shared/layouts/dashboard-layout';
import CompaniesPage from './modules/dashboard/pages/companies-page';
import DashboardPage from './modules/dashboard/pages/dashboard-page';
import DivisiPage from './modules/dashboard/pages/divisi-page';
import RolesUsersPage from './modules/dashboard/pages/roles-users-page';
import RoleShowPage from './modules/dashboard/pages/role-show-page';
import RoleEditPage from './modules/dashboard/pages/role-edit-page';
import ProdukPage from './modules/dashboard/pages/produk-page';
import ItemPage from './modules/dashboard/pages/item-page';
import JenisPengukuranPage from './modules/dashboard/pages/jenis-pengukuran-page';
import TerminPage from './modules/dashboard/pages/termin-page';
import OrderPage from './modules/dashboard/pages/order-page';
import OrderFormPage from './modules/dashboard/pages/order-form-page';
import SurveyPage from './modules/dashboard/pages/survey-page';
import SurveyFormPage from './modules/dashboard/pages/survey-form-page';
import SurveyDetailPage from './modules/dashboard/pages/survey-detail-page';
import MoodboardPage from './modules/dashboard/pages/moodboard-page';
import MoodboardFormPage from './modules/dashboard/pages/moodboard-form-page';
import MoodboardDetailPage from './modules/dashboard/pages/moodboard-detail-page';
import EstimasiPage from './modules/dashboard/pages/estimasi-page';
import EstimasiDetailPage from './modules/dashboard/pages/estimasi-detail-page';
import SettingsPage from './modules/dashboard/pages/settings-page';
import LogTaskPage from './modules/dashboard/pages/log-task-page';
import CommitmentFeePage from './modules/dashboard/pages/commitment-fee-page';
import DesainFinalPage from './modules/dashboard/pages/desain-final-page';
import DesainFinalFormPage from './modules/dashboard/pages/desain-final-form-page';
import DesainFinalDetailPage from './modules/dashboard/pages/desain-final-detail-page';
import InputItemPage from './modules/dashboard/pages/input-item-page';
import InputItemFormPage from './modules/dashboard/pages/input-item-form-page';
import InputItemDetailPage from './modules/dashboard/pages/input-item-detail-page';
import RabPage from './modules/dashboard/pages/rab-page';
import RabCreatePage from './modules/dashboard/pages/rab-create-page';
import RabDetailPage from './modules/dashboard/pages/rab-detail-page';
import RabEditPage from './modules/dashboard/pages/rab-edit-page';
import ContractPage from './modules/dashboard/pages/contract-page';
import InvoicePage from './modules/dashboard/pages/invoice-page';
import InvoiceDetailPage from './modules/dashboard/pages/invoice-detail-page';
import GambarKerjaPage from './modules/dashboard/pages/gambar-kerja-page';
import GambarKerjaDetailPage from './modules/dashboard/pages/gambar-kerja-detail-page';
import ApprovalMaterialPage from './modules/dashboard/pages/approval-material-page';
import ApprovalMaterialFormPage from './modules/dashboard/pages/approval-material-form-page';
import WorkplanPage from './modules/dashboard/pages/workplan-page';
import WorkplanFormPage from './modules/dashboard/pages/workplan-form-page';
import ProjectManagementPage from './modules/dashboard/pages/project-management-page';
import ProjectProgressPage from './modules/dashboard/pages/project-progress-page';
import BastPage from './modules/dashboard/pages/bast-page';
import { useAuthStore } from './modules/auth/store/auth.store';

import React from 'react';

// A simple protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="divisi" element={<DivisiPage />} />
          <Route path="roles" element={<RolesUsersPage />} />
          <Route path="roles/:id" element={<RoleShowPage />} />
          <Route path="roles/create" element={<RoleEditPage />} />
          <Route path="roles/:id/edit" element={<RoleEditPage />} />
          <Route path="produk" element={<ProdukPage />} />
          <Route path="item" element={<ItemPage />} />
          <Route path="pengukuran" element={<JenisPengukuranPage />} />
          <Route path="termin" element={<TerminPage />} />
          <Route path="order" element={<OrderPage />} />
          <Route path="order/create" element={<OrderFormPage />} />
          <Route path="order/:id/edit" element={<OrderFormPage />} />
          <Route path="moodboard" element={<MoodboardPage />} />
          <Route path="moodboard/:orderId/create" element={<MoodboardFormPage />} />
          <Route path="moodboard/:orderId/edit" element={<MoodboardFormPage />} />
          <Route path="moodboard/:orderId" element={<MoodboardDetailPage />} />
          <Route path="estimasi" element={<EstimasiPage />} />
          <Route path="estimasi/:moodboardId" element={<EstimasiDetailPage />} />
          <Route path="commitment-fee" element={<CommitmentFeePage />} />
          <Route path="desain-final" element={<DesainFinalPage />} />
          <Route path="desain-final/:orderId/create" element={<DesainFinalFormPage />} />
          <Route path="desain-final/:orderId/edit" element={<DesainFinalFormPage />} />
          <Route path="desain-final/:orderId" element={<DesainFinalDetailPage />} />
          <Route path="input-item" element={<InputItemPage />} />
          <Route path="input-item/:desainFinalId/create" element={<InputItemFormPage />} />
          <Route path="input-item/:id/edit" element={<InputItemFormPage />} />
          <Route path="input-item/:id" element={<InputItemDetailPage />} />
          <Route path="rab" element={<RabPage />} />
          <Route path="rab/:inputItemId/create" element={<RabCreatePage />} />
          <Route path="rab/:id/edit" element={<RabEditPage />} />
          <Route path="rab/:id" element={<RabDetailPage />} />
          <Route path="kontrak" element={<ContractPage />} />
          <Route path="invoice" element={<InvoicePage />} />
          <Route path="invoice/:contractId" element={<InvoiceDetailPage />} />
          <Route path="survey" element={<SurveyPage />} />
          <Route path="survey/create" element={<SurveyFormPage />} />
          <Route path="survey/:id/edit" element={<SurveyFormPage />} />
          <Route path="survey/:id" element={<SurveyDetailPage />} />
          <Route path="gambar-kerja" element={<GambarKerjaPage />} />
          <Route path="gambar-kerja/:orderId" element={<GambarKerjaDetailPage />} />
          <Route path="approval-material" element={<ApprovalMaterialPage />} />
          <Route path="approval-material/:orderId" element={<ApprovalMaterialFormPage />} />
          <Route path="workplan" element={<WorkplanPage />} />
          <Route path="workplan/:orderId" element={<WorkplanFormPage />} />
          <Route path="project-management" element={<ProjectManagementPage />} />
          <Route path="project-management/:id" element={<ProjectProgressPage />} />
          <Route path="bast/:orderId" element={<BastPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="log-tasks" element={<LogTaskPage />} />
          <Route path="*" element={<div className="p-4 text-gray-500">Page under construction</div>} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
