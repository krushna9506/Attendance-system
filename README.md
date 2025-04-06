# Attendance Tracking System

A comprehensive attendance tracking system with face recognition and QR code verification capabilities.

## Features

- **Authentication System**
  - User registration and login
  - Password reset functionality
  - Profile management
  - JWT-based authentication
  - Role-based access control

- **Event Management**
  - Create, read, update, and delete events
  - QR code generation for events
  - Event status tracking
  - Event analytics

- **Attendance Management**
  - QR code-based attendance marking
  - Face recognition-based attendance marking
  - Manual attendance marking
  - Attendance history tracking
  - Check-in/check-out functionality
  - Attendance status updates

- **Engagement Tracking**
  - Real-time engagement monitoring
  - Activity pulse tracking
  - Engagement scoring
  - Analytics and reporting
  - Data visualization
  - Export capabilities

- **Verification Methods**
  - Face recognition
  - QR code scanning
  - Manual verification
  - Device tracking
  - Location verification

## Technology Stack

- **Backend**
  - Node.js
  - Express.js
  - MongoDB
  - Redis
  - JWT Authentication
  - Face-api.js
  - QR Code Generation

- **Security Features**
  - JWT authentication
  - Password hashing
  - Role-based authorization
  - Device tracking
  - Anomaly detection
  - Session management

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - User login
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Reset password
- GET `/api/auth/profile` - Get user profile
- PATCH `/api/auth/profile` - Update user profile
- PATCH `/api/auth/change-password` - Change password

### Events
- POST `/api/events` - Create a new event
- GET `/api/events` - Get all events
- GET `/api/events/:id` - Get event by ID
- PATCH `/api/events/:id` - Update event
- DELETE `/api/events/:id` - Delete event
- POST `/api/events/:id/qr-code` - Generate QR code for event

### Attendance
- POST `/api/attendance/events/:eventId/users/:userId/qr` - Mark attendance with QR code
- POST `/api/attendance/events/:eventId/users/:userId/manual` - Mark attendance manually
- GET `/api/attendance/users/:userId` - Get user attendance history
- GET `/api/attendance/events/:eventId` - Get event attendance
- PATCH `/api/attendance/:id` - Update attendance record
- POST `/api/attendance/:id/checkout` - Check out from event

### Verification
- POST `/api/verification/users/:userId/register-face` - Register user face
- POST `/api/verification/events/:eventId/users/:userId/verify-face` - Verify attendance with face
- POST `/api/verification/events/:eventId/users/:userId/verify-qr` - Verify attendance with QR code
- POST `/api/verification/events/:eventId/users/:userId/generate-qr` - Generate attendance QR code

### Engagement
- POST `/api/engagement/events/:eventId/pulse` - Send activity pulse
- GET `/api/engagement/events/:eventId/analytics` - Get engagement analytics
- GET `/api/engagement/users/:userId/history` - Get user engagement history
- GET `/api/engagement/events/:eventId/report` - Generate engagement report
- GET `/api/engagement/events/:eventId/chart` - Generate engagement chart

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/attendance-system.git
cd attendance-system
```

2. Install dependencies
```bash
cd backend
npm install
```

3. Set up environment variables
Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance-system
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
REDIS_URL=redis://localhost:6379
```

4. Download face recognition models
```bash
mkdir -p backend/models
cd backend/models
# Download face-api.js models from https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

5. Start the server
```bash
npm run dev
```

## Usage

### Face Recognition

1. Register user face:
```javascript
// Frontend
const imageData = await captureImageFromCamera();
await axios.post(`/api/verification/users/${userId}/register-face`, {
  imageData
});
```

2. Verify attendance with face:
```javascript
// Frontend
const imageData = await captureImageFromCamera();
await axios.post(`/api/verification/events/${eventId}/users/${userId}/verify-face`, {
  imageData
});
```

### QR Code Verification

1. Generate QR code for event:
```javascript
// Backend
const { qrCode, token } = await generateEventQRCode(eventId, expiryTime);
```

2. Verify attendance with QR code:
```javascript
// Frontend
const qrToken = await scanQRCode();
await axios.post(`/api/verification/events/${eventId}/users/${userId}/verify-qr`, {
  qrToken
});
```

## License

MIT 