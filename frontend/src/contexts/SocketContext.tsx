import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  joinClass: (classId: string) => void;
  leaveClass: (classId: string) => void;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  joinClass: () => {},
  leaveClass: () => {},
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token
        }
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token]);

  const joinClass = (classId: string) => {
    if (socket) {
      socket.emit('joinClass', classId);
    }
  };

  const leaveClass = (classId: string) => {
    if (socket) {
      socket.emit('leaveClass', classId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinClass, leaveClass, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 