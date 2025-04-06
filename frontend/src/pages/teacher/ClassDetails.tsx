import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';

interface Class {
  id: string;
  name: string;
  schedule: string;
  mode: 'online' | 'offline';
  status: 'scheduled' | 'active' | 'completed';
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface QRCode {
  id: string;
  code: string;
  sequence: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late';
  verificationMethod: string;
  timestamp: string;
}

const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, joinClass, leaveClass } = useSocket();
  const [classData, setClassData] = useState<Class | null>(null);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        const [classResponse, attendanceResponse] = await Promise.all([
          axios.get(`/api/classes/${id}`),
          axios.get(`/api/classes/${id}/attendance`)
        ]);

        setClassData(classResponse.data.data.class);
        setAttendance(attendanceResponse.data.data.attendance);
        setLoading(false);
      } catch (error) {
        setError('Error fetching class details');
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [id]);

  useEffect(() => {
    if (id && socket) {
      joinClass(id);

      socket.on('qrCodeUpdate', ({ qrCode }) => {
        setQRCodes(prevCodes => {
          const newCodes = [...prevCodes];
          const index = newCodes.findIndex(code => code.id === qrCode.id);
          
          if (index !== -1) {
            newCodes[index] = qrCode;
          } else {
            newCodes.push(qrCode);
          }

          return newCodes.sort((a, b) => b.sequence - a.sequence);
        });
      });

      return () => {
        leaveClass(id);
        socket.off('qrCodeUpdate');
      };
    }
  }, [id, socket, joinClass, leaveClass]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGenerateQRCode = async () => {
    try {
      const response = await axios.post(`/api/classes/${id}/qr-codes`);
      setQRCodes(response.data.data.qrCodes);
    } catch (error) {
      setError('Error generating QR codes');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {classData?.name}
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="QR Codes" />
          <Tab label="Attendance" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Active QR Codes</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateQRCode}
              disabled={classData?.status !== 'active'}
            >
              Generate New QR Code
            </Button>
          </Box>

          <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={2}>
            {qrCodes.map((qrCode) => (
              <Paper key={qrCode.id} sx={{ p: 2 }}>
                <img src={qrCode.code} alt={`QR Code ${qrCode.sequence}`} style={{ width: '100%' }} />
                <Typography variant="body2" align="center" mt={1}>
                  Sequence: {qrCode.sequence}
                </Typography>
                <Typography variant="caption" display="block" align="center">
                  Valid until: {format(new Date(qrCode.validUntil), 'HH:mm:ss')}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Attendance Records
          </Typography>

          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>Student</Box>
                <Box component="th" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>Status</Box>
                <Box component="th" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>Method</Box>
                <Box component="th" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>Time</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {attendance.map((record) => (
                <Box component="tr" key={record.id}>
                  <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {record.studentName}
                  </Box>
                  <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {record.status}
                  </Box>
                  <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {record.verificationMethod}
                  </Box>
                  <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {format(new Date(record.timestamp), 'HH:mm:ss')}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ClassDetails; 