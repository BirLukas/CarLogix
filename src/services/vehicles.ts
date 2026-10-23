import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Vehicle } from '../types';
import { czechDateToIso, isoToCzechDate } from '../components';

const LOCAL_VEHICLES_KEY = '@carlogix_vehicles';

export class VehicleService {
  /**
   * Načte seznam vozidel uživatele.
   */
  public static async getVehicles(userId: string): Promise<Vehicle[]> {
    const isSupabaseUser = isSupabaseConfigured() && !userId.startsWith('demo-') && userId.includes('-');
    if (isSupabaseUser) {
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
        stkExpirationDate: row.stk_expiration_date ? isoToCzechDate(row.stk_expiration_date) : undefined,
        insuranceExpirationDate: row.insurance_expiration_date ? isoToCzechDate(row.insurance_expiration_date) : undefined,
        oilIntervalKm: row.oil_interval_km,
        lastOilChangeKm: row.last_oil_change_km,
      }));
    } else {
      // Local AsyncStorage fallback for demo & offline mode
      try {
        const stored = await AsyncStorage.getItem(LOCAL_VEHICLES_KEY);
        if (stored) {
          const list: Vehicle[] = JSON.parse(stored);
          // Vyčistit případné testovací záznamy z lokálního úložiště
          const sanitized = list.filter((v) => v && v.brand && v.model && !v.id?.includes('peugeot') && !v.brand?.toLowerCase().includes('peugeot'));
          if (sanitized.length !== list.length) {
            await AsyncStorage.setItem(LOCAL_VEHICLES_KEY, JSON.stringify(sanitized));
          }
          return sanitized.filter((v) => v.ownerId === userId);
        }
        return [];
      } catch (err) {
        console.error('Error loading local vehicles:', err);
        return [];
      }
    }
  }

  /**
   * Přidá nové vozidlo do garáže.
   */
  public static async addVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<{ vehicle?: Vehicle; error?: string }> {
    const currentYear = new Date().getFullYear();
    if (!vehicle.year || isNaN(vehicle.year) || vehicle.year < 1900 || vehicle.year > currentYear + 1) {
      return { error: `Neplatný rok výroby vozidla (povolené rozmezí: 1900–${currentYear + 1}).` };
    }

    const isSupabaseUser = isSupabaseConfigured() && !vehicle.ownerId.startsWith('demo-') && vehicle.ownerId.includes('-');
    if (isSupabaseUser) {
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
          stk_expiration_date: czechDateToIso(vehicle.stkExpirationDate) || null,
          insurance_expiration_date: czechDateToIso(vehicle.insuranceExpirationDate) || null,
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
        stkExpirationDate: data.stk_expiration_date ? isoToCzechDate(data.stk_expiration_date) : undefined,
        insuranceExpirationDate: data.insurance_expiration_date ? isoToCzechDate(data.insurance_expiration_date) : undefined,
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
    const isSupabase = isSupabaseConfigured() && !vehicleId.startsWith('local-');
    if (isSupabase) {
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
