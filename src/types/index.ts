/**
 * Core type definitions for CarLogix based on the PRD specification.
 */

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  isMechanic: boolean;
  workshopName?: string;
  createdAt: string;
}

export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'cng' | 'hybrid' | 'electric';

export interface Vehicle {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  year: number;
  engineCode: string;
  fuelType: FuelType;
  currentOdometer: number;
  vin?: string;
  licensePlate: string;
  stkExpirationDate: string;
  insuranceExpirationDate: string;
  oilIntervalKm: number;
  lastOilChangeKm: number;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  userId: string;
  date: string;
  odometer: number;
  liters: number;
  priceTotalCzK: number;
  pricePerLiter: number;
  isFullTank: boolean;
  calculatedConsumption?: number;
}

export interface ServicePart {
  name: string;
  brand: string;
  partNumber: string;
  priceCzK: number;
}

export interface ServiceEntry {
  id: string;
  vehicleId: string;
  authorId: string;
  authorRole: 'owner' | 'mechanic';
  workshopStamp?: string;
  date: string;
  odometer: number;
  title: string;
  description: string;
  partsReplaced: ServicePart[];
  laborPriceCzK: number;
  totalPriceCzK: number;
  invoiceImageUrl?: string;
  isConfirmedByOwner: boolean;
}

export interface OBDLiveMetrics {
  rpm: number;
  speed: number;
  coolantTemp: number;
  mapPressure?: number;
  mafAirFlow?: number;
  currentConsumptionLPer100Km?: number;
  idleConsumptionLPerHour?: number;
}
