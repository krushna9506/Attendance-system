import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface Class {
  id: string;
  name: string;
  mode: 'online' | 'offline';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  schedule: {
    startDate: string;
    endDate: string;
    days: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

const TeacherDashboard: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCreateClass = async (classData: Partial<Class>) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/classes`,
        classData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchClasses();
      setOpenDialog(false);
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleGenerateQR = async (classId: string) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/classes/${classId}/qr-codes`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      navigate(`/teacher/class/${classId}`);
    } catch (error) {
      console.error('Error generating QR codes:', error);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Class Name', width: 200 },
    {
      field: 'mode',
      headerName: 'Mode',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          color={params.value === 'online' ? 'primary' : 'secondary'}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          color={
            params.value === 'completed'
              ? 'success'
              : params.value === 'in-progress'
              ? 'warning'
              : 'default'
          }
        />
      ),
    },
    {
      field: 'schedule',
      headerName: 'Schedule',
      width: 200,
      valueGetter: (params: any) =>
        `${format(new Date(params.row.schedule.startDate), 'MMM d, yyyy')} - ${format(
          new Date(params.row.schedule.endDate),
          'MMM d, yyyy'
        )}`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params: any) => (
        <Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleGenerateQR(params.row.id)}
          >
            Generate QR
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="h1">
          Teacher Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Class
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <DataGrid
              rows={classes}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              autoHeight
            />
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Class</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Class Name"
            fullWidth
            variant="outlined"
          />
          {/* Add more fields for class creation */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={() => handleCreateClass({})} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherDashboard; 