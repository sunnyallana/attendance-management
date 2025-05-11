import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<PrivateRoute allowedRoles={['superAdmin']} />}>
            <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route path="/org-admin/*" element={<OrgAdminDashboard />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/*" element={<TeacherDashboard />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['parent']} />}>
            <Route path="/parent/*" element={<ParentDashboard />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['student']} />}>
            <Route path="/student/*" element={<StudentDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;