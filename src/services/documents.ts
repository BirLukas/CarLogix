import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  InsuranceOcrResult,
  InvoiceOcrResult,
  StkOcrResult,
  VehicleDocument,
  VehicleDocumentType,
} from '../types';
import { czechDateToIso, isoToCzechDate } from '../components/DateFormattedInput';

const STORAGE_BUCKET = 'carlogix-documents';
const STORAGE_KEY_DOCS = '@carlogix_vehicle_documents';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export class DocumentStorageService {
  /**
   * Nahraje obrázek do privátního Supabase Storage bucketu.
   * V režimu offline/demo vrátí lokální URI.
   */
  public static async uploadImage(params: {
    vehicleId: string;
    folder: 'invoices' | 'blacklist' | 'documents';
    localUri: string;
    base64?: string;
    mimeType?: string;
  }): Promise<string> {
    const userId = await getAuthenticatedUserId();
    if (!userId || !params.base64) {
      return params.localUri;
    }

    const ext = params.mimeType?.includes('pdf')
      ? 'pdf'
      : params.mimeType?.includes('png')
        ? 'png'
        : 'jpg';
    const filePath = `${userId}/${params.vehicleId}/${params.folder}/${Date.now()}.${ext}`;
    const bytes = base64ToUint8Array(params.base64);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, bytes, {
        contentType: params.mimeType || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.warn('Nepodařilo se nahrát soubor do Supabase Storage, používám lokální URI:', error.message);
      return params.localUri;
    }

    return filePath;
  }

  /**
   * Převede uloženou cestu v bucketu na dočasnou podepsanou URL (nebo vrátí lokální URI).
   */
  public static async resolveImageUrl(pathOrUri?: string): Promise<string | undefined> {
    if (!pathOrUri) return undefined;
    if (
      pathOrUri.startsWith('http://') ||
      pathOrUri.startsWith('https://') ||
      pathOrUri.startsWith('file://') ||
      pathOrUri.startsWith('content://') ||
      pathOrUri.startsWith('data:')
    ) {
      return pathOrUri;
    }

    if (!isSupabaseConfigured()) return pathOrUri;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(pathOrUri, 3600);

    if (error || !data?.signedUrl) {
      return undefined;
    }
    return data.signedUrl;
  }

  /**
   * Odstraní soubor ze Supabase Storage, pokud jde o cloudovou cestu.
   */
  public static async deleteImage(pathOrUri?: string): Promise<void> {
    if (!pathOrUri || pathOrUri.startsWith('file://') || pathOrUri.startsWith('http')) {
      return;
    }
    if (!isSupabaseConfigured()) return;
    await supabase.storage.from(STORAGE_BUCKET).remove([pathOrUri]);
  }
}

export class DocumentScannerService {
  /**
   * Zavolá Supabase Edge Function `analyze-document` (Gemini Vision Proxy)
   * pro automatické vytěžení údajů z faktury nebo protokolu STK.
   */
  public static async analyzeDocument(
    imageBase64: string,
    documentType: 'invoice',
    mimeType?: string,
  ): Promise<InvoiceOcrResult>;
  public static async analyzeDocument(
    imageBase64: string,
    documentType: 'stk',
    mimeType?: string,
  ): Promise<StkOcrResult>;
  public static async analyzeDocument(
    imageBase64: string,
    documentType: 'insurance',
    mimeType?: string,
  ): Promise<InsuranceOcrResult>;
  public static async analyzeDocument(
    imageBase64: string,
    documentType: 'invoice' | 'stk' | 'insurance',
    mimeType: string = 'image/jpeg',
  ): Promise<InvoiceOcrResult | StkOcrResult | InsuranceOcrResult> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase není nakonfigurován. AI vytěžování vyžaduje cloudové připojení.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error('Pro AI vytěžování se prosím přihlaste reálným účtem (v demo režimu není AI dostupné).');
    }

    const { data, error } = await supabase.functions.invoke('analyze-document', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        imageBase64,
        mimeType,
        documentType,
      },
    });

    if (error) {
      let detailedMsg = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx) {
          const rawText =
            typeof ctx.clone === 'function'
              ? await ctx.clone().text()
              : typeof ctx.text === 'function'
                ? await ctx.text()
                : '';
          if (rawText) {
            try {
              const errBody = JSON.parse(rawText);
              if (errBody?.error) detailedMsg = errBody.error;
              else detailedMsg = rawText;
            } catch {
              detailedMsg = rawText;
            }
          }
        }
      } catch {
        // ignore context parse error
      }
      throw new Error(detailedMsg || 'Nepodařilo se spojit s AI službou pro vytěžení dokumentu.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.data) {
      throw new Error('AI služba nevrátila žádná rozpoznaná data.');
    }

    return data.data;
  }
}

export class VehicleDocumentService {
  public static async getDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    const userId = await getAuthenticatedUserId();
    if (userId) {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          userId: row.user_id,
          docType: row.doc_type as VehicleDocumentType,
          title: row.title,
          imageUrl: row.image_url,
          notes: row.notes || undefined,
          expirationDate: row.expiration_date ? isoToCzechDate(row.expiration_date) : undefined,
          createdAt: row.created_at,
        }));
      }
      if (error) {
        console.warn('Chyba načítání dokumentů ze Supabase, zkouším lokální cache:', error.message);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCS);
      if (!raw) return [];
      const list: VehicleDocument[] = JSON.parse(raw);
      return list.filter((d) => d.vehicleId === vehicleId);
    } catch {
      return [];
    }
  }

  public static async addDocument(
    doc: Omit<VehicleDocument, 'id' | 'createdAt' | 'userId'>,
  ): Promise<VehicleDocument> {
    const userId = await getAuthenticatedUserId();
    if (userId) {
      const isoExp = doc.expirationDate ? czechDateToIso(doc.expirationDate) : null;
      const { data, error } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: doc.vehicleId,
          user_id: userId,
          doc_type: doc.docType,
          title: doc.title,
          image_url: doc.imageUrl,
          notes: doc.notes || null,
          expiration_date: isoExp,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          vehicleId: data.vehicle_id,
          userId: data.user_id,
          docType: data.doc_type as VehicleDocumentType,
          title: data.title,
          imageUrl: data.image_url,
          notes: data.notes || undefined,
          expirationDate: data.expiration_date ? isoToCzechDate(data.expiration_date) : undefined,
          createdAt: data.created_at,
        };
      }
      if (error) {
        throw new Error(error.message);
      }
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCS);
    const list: VehicleDocument[] = raw ? JSON.parse(raw) : [];
    const created: VehicleDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify([created, ...list]));
    return created;
  }

  public static async deleteDocument(doc: VehicleDocument): Promise<boolean> {
    const userId = await getAuthenticatedUserId();
    if (userId && !doc.id.startsWith('doc-')) {
      const { error } = await supabase.from('vehicle_documents').delete().eq('id', doc.id);
      if (error) {
        console.error('Chyba při mazání dokumentu:', error.message);
        return false;
      }
      await DocumentStorageService.deleteImage(doc.imageUrl);
      return true;
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCS);
      const list: VehicleDocument[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(
        STORAGE_KEY_DOCS,
        JSON.stringify(list.filter((d) => d.id !== doc.id)),
      );
      return true;
    } catch {
      return false;
    }
  }
}
