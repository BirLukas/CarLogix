import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Vehicle } from '../types';

const LOCAL_VEHICLES_KEY = '@carlogix_vehicles';

export const DEFAULT_PEUGEOT_206: Vehicle = {
  id: 'peugeot-206-default',
  ownerId: 'demo-user-1',
  brand: 'Peugeot',
  model: '206',
  year: 2006,
  engineCode: 'KFW',
  fuelType: 'petrol',
  currentOdometer: 184520,
  licensePlate: '4H1 2060',
  vin: 'VF32AKFWF44123456',
  stkExpirationDate: '2026-11-14',
  insuranceExpirationDate: '2026-12-31',
  oilIntervalKm: 15000,
  lastOilChangeKm: 179000,
};

export class VehicleService {
  /**
   * Načte seznam vozidel uživatele.
   */
  public static async getVehicles(userId: string): Promise<Vehicle[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles from Supabase:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        ownerId: row.owner_id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        engineCode: row.engine_code,
        fuelType: row.fuel_type,
        currentOdometer: row.current_odometer,
        vin: row.vin,
        licensePlate: row.license_plate,
        stkExpirationDate: row.stk_expiration_date,
        insuranceExpirationDate: row.insurance_expiration_date,
        oilIntervalKm: row.oil_interval_km,
        lastOilChangeKm: row.last_oil_change_km,
      }));
    } else {
      // Local AsyncStorage fallback for demo & offline mode
      try {
        const stored = await AsyncStorage.getItem(LOCAL_VEHICLES_KEY);
        if (stored) {
          const list: Vehicle[] = JSON.parse(stored);
          return list.filter((v) => v.ownerId === userId);
        }
        // If empty, initialize with default Peugeot 206
        const initial = [{ ...DEFAULT_PEUGEOT_206, ownerId: userId }];
        await AsyncStorage.setItem(LOCAL_VEHICLES_KEY, JSON.stringify(initial));
        return initial;
      } catch (err) {
        console.error('Error loading local vehicles:', err);
        return [DEFAULT_PEUGEOT_206];
      }
    }
  }

  /**
   * Přidá nové vozidlo do garáže.
   */
  public static async addVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<{ vehicle?: Vehicle; error?: string }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          owner_id: vehicle.ownerId,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          engine_code: vehicle.engineCode,
          fuel_type: vehicle.fuelType,
          current_odometer: vehicle.currentOdometer,
          vin: vehicle.vin,
          license_plate: vehicle.licensePlate,
          stk_expiration_date: vehicle.stkExpirationDate,
          insurance_expiration_date: vehicle.insuranceExpirationDate,
          oil_interval_km: vehicle.oilIntervalKm,
          last_oil_change_km: vehicle.lastOilChangeKm,
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      const created: Vehicle = {
        id: data.id,
        ownerId: data.owner_id,
        brand: data.brand,
        model: data.model,
        year: data.year,
        engineCode: data.engine_code,
        fuelType: data.fuel_type,
        currentOdometer: data.current_odometer,
        vin: data.vin,
        licensePlate: data.license_plate,
        stkExpirationDate: data.stk_expiration_date,
        insuranceExpirationDate: data.insurance_expiration_date,
        oilIntervalKm: data.oil_interval_km,
        lastOilChangeKm: data.last_oil_change_km,
      };

      return { vehicle: created };
    } else {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_VEHICLES_KEY);
        const list: Vehicle[] = stored ? JSON.parse(stored) : [];
        const newVehicle: Vehicle = {
          ...vehicle,
          id: 'local-' + Date.now(),
        };
        list.push(newVehicle);
        await AsyncStorage.setItem(LOCAL_VEHICLES_KEY, JSON.stringify(list));
        return { vehicle: newVehicle };
      } catch (err: any) {
        return { error: err.message || 'Chyba při ukládání vozidla' };
      }
    }
  }

  /**
   * Smaže vozidlo z garáže.
   */
  public static async deleteVehicle(vehicleId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      return !error;
    } else {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_VEHICLES_KEY);
        if (!stored) return true;
        const list: Vehicle[] = JSON.parse(stored);
        const filtered = list.filter((v) => v.id !== vehicleId);
        await AsyncStorage.setItem(LOCAL_VEHICLES_KEY, JSON.stringify(filtered));
        return true;
      } catch {
        return false;
      }
    }
  }
}
