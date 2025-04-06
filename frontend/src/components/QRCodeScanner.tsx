import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Result } from '@zxing/library';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError: (error: Error) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef(new BrowserQRCodeReader());

  useEffect(() => {
    const startScanner = async () => {
      try {
        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
        const selectedDeviceId = videoInputDevices[0].deviceId;

        await codeReader.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result: Result | null, error: Error | null) => {
            if (result) {
              onScan(result.getText());
            }
            if (error && !(error instanceof Error)) {
              onError(new Error('Failed to scan QR code'));
            }
          }
        );
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Failed to start QR scanner'));
      }
    };

    startScanner();

    return () => {
      codeReader.current.reset();
    };
  }, [onScan, onError]);

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', borderRadius: 8 }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 200,
          height: 200,
          border: '2px solid #1976d2',
          borderRadius: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    </Box>
  );
};

export default QRCodeScanner; 