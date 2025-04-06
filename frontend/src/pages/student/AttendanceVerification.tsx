import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { QrCode as QrCodeIcon, Face as FaceIcon, LocationOn as LocationIcon } from '@mui/icons-material';
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

const steps = ['QR Code', 'Facial Recognition', 'Location Verification'];

const AttendanceVerification: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const [activeStep, setActiveStep] = useState(0);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/classes/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setClassData(response.data.data.class);
    } catch (error) {
      console.error('Error fetching class details:', error);
      setError('Failed to fetch class details');
    }
  };

  const handleQRCodeScan = async (qrCode: string) => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/attendance/verify/qr`,
        {
          classId,
          qrCode,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setActiveStep(1);
    } catch (error) {
      console.error('Error verifying QR code:', error);
      setError('Invalid or expired QR code');
    } finally {
      setLoading(false);
    }
  };

  const startFaceRecognition = async () => {
    try {
      setLoading(true);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start face recognition process
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/attendance/verify/face`,
        {
          classId,
          image: await captureFrame(),
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setActiveStep(2);
      } else {
        setError('Face recognition failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during face recognition:', error);
      setError('Failed to verify face. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const captureFrame = async (): Promise<string> => {
    if (!videoRef.current) {
      throw new Error('Video element not found');
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const verifyLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await axios.post(
        `${process.env.REACT_APP_API_URL}/attendance/verify/location`,
        {
          classId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess(true);
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error verifying location:', error);
      setError('Failed to verify location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <QrCodeIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Scan QR Code
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Please scan the QR code displayed by your teacher
            </Typography>
            {/* Add QR code scanner component here */}
          </Box>
        );
      case 1:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <FaceIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Facial Recognition
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Please look at the camera for facial verification
            </Typography>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxWidth: 400 }}
            />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <LocationIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Location Verification
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Please allow location access to verify your presence
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  if (!classData) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Verify Attendance - {classData.name}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ my: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Attendance verified successfully!
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={() => setActiveStep((prev) => prev - 1)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (activeStep === 0) {
                // Handle QR code scan
              } else if (activeStep === 1) {
                startFaceRecognition();
              } else if (activeStep === 2) {
                verifyLocation();
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : activeStep === steps.length - 1 ? (
              'Verify'
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AttendanceVerification; 