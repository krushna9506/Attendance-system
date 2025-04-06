import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import ClassDetails from './pages/teacher/ClassDetails';
import AttendanceVerification from './pages/student/AttendanceVerification';
import Profile from './pages/Profile';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <PrivateRoute roles={['teacher']}>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="class/:id" element={<ClassDetails />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <PrivateRoute roles={['student']}>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="verify-attendance" element={<AttendanceVerification />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 
 