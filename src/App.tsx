/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { FinanceDashboard } from './pages/admin/FinanceDashboard';
import { SettingsDashboard } from './pages/admin/SettingsDashboard';
import { CheckInDashboard } from './pages/admin/CheckInDashboard';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherStudents } from './pages/teacher/TeacherStudents';
import { TeacherWorkouts } from './pages/teacher/TeacherWorkouts';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentEvolution } from './pages/student/StudentEvolution';
import { Nutrition } from './pages/student/Nutrition';
import { Chat } from './pages/shared/Chat';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            
            {/* Admin Routes */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/checkin" element={<CheckInDashboard />} />
            <Route path="admin/finance" element={<FinanceDashboard />} />
            <Route path="admin/settings" element={<SettingsDashboard />} />
            <Route path="admin/chat" element={<Chat />} />
            
            {/* Teacher Routes */}
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/students" element={<TeacherStudents />} />
            <Route path="teacher/workouts" element={<TeacherWorkouts />} />
            <Route path="teacher/chat" element={<Chat />} />
            
            {/* Student Routes */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/progress" element={<StudentEvolution />} />
            <Route path="student/evolution" element={<StudentEvolution />} />
            <Route path="student/nutrition" element={<Nutrition />} />
            <Route path="student/chat" element={<Chat />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
