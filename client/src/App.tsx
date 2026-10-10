/**
 * File: App.tsx
 * Purpose: This file serves as the main entry point for the React application's routing.
 * It defines the different pages (Passenger View, Admin Dashboard, Reports) and links them to specific URLs.
 * Why it exists: To enable navigation between different views without reloading the page.
 * Technologies used: React, React Router DOM.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PassengerView from './pages/PassengerView';
import AdminDashboard from './pages/AdminDashboard';
import ReportsView from './pages/ReportsView';

function ApplicationRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PassengerView />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="reports" element={<ReportsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default ApplicationRouter;
