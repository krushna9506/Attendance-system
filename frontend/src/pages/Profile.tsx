import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Avatar,
  Alert,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  currentPassword: yup.string().when('newPassword', {
    is: (val: string) => val && val.length > 0,
    then: yup.string().required('Current password is required'),
  }),
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

const Profile: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        setSuccess(null);

        const updateData: any = {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
        };

        if (values.newPassword) {
          updateData.currentPassword = values.currentPassword;
          updateData.newPassword = values.newPassword;
        }

        const response = await axios.put(
          `${process.env.REACT_APP_API_URL}/users/profile`,
          updateData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        updateUser(response.data.data.user);
        setSuccess('Profile updated successfully');
        formik.resetForm({
          values: {
            ...formik.values,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          },
        });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setError(error.response?.data?.message || 'Failed to update profile');
      }
    },
  });

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: 'primary.main',
              fontSize: '2.5rem',
              mb: 2,
            }}
          >
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Avatar>
          <Typography variant="h5" gutterBottom>
            Profile Settings
          </Typography>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="firstName"
                name="firstName"
                label="First Name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                name="lastName"
                label="Last Name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Change Password
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="currentPassword"
                name="currentPassword"
                label="Current Password"
                type="password"
                value={formik.values.currentPassword}
                onChange={formik.handleChange}
                error={
                  formik.touched.currentPassword &&
                  Boolean(formik.errors.currentPassword)
                }
                helperText={
                  formik.touched.currentPassword && formik.errors.currentPassword
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="newPassword"
                name="newPassword"
                label="New Password"
                type="password"
                value={formik.values.newPassword}
                onChange={formik.handleChange}
                error={
                  formik.touched.newPassword && Boolean(formik.errors.newPassword)
                }
                helperText={formik.touched.newPassword && formik.errors.newPassword}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                error={
                  formik.touched.confirmPassword &&
                  Boolean(formik.errors.confirmPassword)
                }
                helperText={
                  formik.touched.confirmPassword && formik.errors.confirmPassword
                }
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!formik.isValid || !formik.dirty}
            >
              Save Changes
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Profile; 