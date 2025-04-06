import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  from: {
    pathname: string;
  };
}

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
  firstName: yup.string().when('isRegister', {
    is: true,
    then: yup.string().required('First name is required'),
  }),
  lastName: yup.string().when('isRegister', {
    is: true,
    then: yup.string().required('Last name is required'),
  }),
});

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>('student');
  const { login, register, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState)?.from?.pathname || '/';

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      isRegister: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (values.isRegister) {
          await register({
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            role: selectedRole,
          });
        } else {
          await login(values.email, values.password);
        }
        navigate(from);
      } catch (error) {
        // Error is handled by the auth context
      }
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    formik.setFieldValue('isRegister', newValue === 1);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Attendance System
          </Typography>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            {activeTab === 1 && (
              <>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                  margin="normal"
                />
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Tabs
                    value={selectedRole === 'student' ? 0 : 1}
                    onChange={(_, newValue) =>
                      setSelectedRole(newValue === 0 ? 'student' : 'teacher')
                    }
                    centered
                  >
                    <Tab label="Student" />
                    <Tab label="Teacher" />
                  </Tabs>
                </Box>
              </>
            )}

            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              margin="normal"
            />
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              margin="normal"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {activeTab === 0 ? 'Login' : 'Register'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 