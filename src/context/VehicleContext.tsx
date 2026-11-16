import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Vehicle } from '../types';
import { VehicleService } from '../services/vehicles';
import { useAuth } from './AuthContext';

interface VehicleContextType {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  isLoading: boolean;
  refreshVehicles: () => Promise<Vehicle[]>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshVehicles = useCallback(async (): Promise<Vehicle[]> => {
    if (!user) {
      setVehicles([]);
      setSelectedVehicle(null);
      setIsLoading(false);
      return [];
    }

    try {
      const list = await VehicleService.getVehicles(user.id);
      setVehicles(list);
      setSelectedVehicle((prev) => {
        if (list.length === 0) return null;
        if (prev) {
          const match = list.find((v) => v.id === prev.id);
          if (match) return match;
        }
        return list[0];
      });
      return list;
    } catch (error) {
      console.error('Chyba při načítání vozidel:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    refreshVehicles();
  }, [refreshVehicles]);

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        selectedVehicle,
        setSelectedVehicle,
        isLoading,
        refreshVehicles,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = (): VehicleContextType => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};
