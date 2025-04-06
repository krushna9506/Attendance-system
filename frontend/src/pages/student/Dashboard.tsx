import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
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

interface Attendance {
  id: string;
  class: {
    id: string;
    name: string;
  };
  status: 'present' | 'absent' | 'late';
  timestamp: string;
  verificationMethod: 'qr' | 'face' | 'location';
}

const StudentDashboard: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
    fetchAttendance();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/classes/enrolled`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(response.data.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleVerifyAttendance = (classId: string) => {
    navigate(`/student/verify/${classId}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Student Dashboard
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Enrolled Classes
            </Typography>
            <Grid container spacing={2}>
              {classes.map((classItem) => (
                <Grid item xs={12} key={classItem.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{classItem.name}</Typography>
                      <Typography color="text.secondary">
                        {format(new Date(classItem.schedule.startDate), 'MMM d, yyyy')} -{' '}
                        {format(new Date(classItem.schedule.endDate), 'MMM d, yyyy')}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={classItem.mode}
                          color={classItem.mode === 'online' ? 'primary' : 'secondary'}
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={classItem.status}
                          color={
                            classItem.status === 'completed'
                              ? 'success'
                              : classItem.status === 'in-progress'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => handleVerifyAttendance(classItem.id)}
                        disabled={classItem.status !== 'in-progress'}
                      >
                        Verify Attendance
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Attendance History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.class.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          color={
                            record.status === 'present'
                              ? 'success'
                              : record.status === 'late'
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.timestamp), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Chip label={record.verificationMethod} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StudentDashboard; 