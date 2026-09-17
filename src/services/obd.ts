import { OBDLiveMetrics } from '../types';

export interface OBDConnectionStatus {
  isConnected: boolean;
  adapterName?: string;
  isSimulated: boolean;
}

/**
 * Service skeleton for managing OBD-II / BLE 4.0 adapter connections
 * and mock telemetry simulation for presentation/testing.
 */
export class OBDService {
  private static isSimulated: boolean = true;
  private static isConnected: boolean = false;

  public static getStatus(): OBDConnectionStatus {
    return {
      isConnected: this.isConnected,
      adapterName: this.isSimulated ? 'Mock Simulator (Peugeot 206)' : 'Vgate iCar Pro',
      isSimulated: this.isSimulated,
    };
  }

  public static setSimulationMode(enabled: boolean): void {
    this.isSimulated = enabled;
  }

  public static getMockMetrics(): OBDLiveMetrics {
    return {
      rpm: 2150,
      speed: 68,
      coolantTemp: 88,
      mapPressure: 45,
      currentConsumptionLPer100Km: 5.6,
    };
  }
}
