import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  imageBase64: string;
  mimeType?: string;
  documentType: 'invoice' | 'stk' | 'insurance';
}

const INVOICE_PROMPT = `Jsi přesný OCR asistent pro české autoservisní faktury a účtenky za opravy či díly vozidel.
Z přiloženého obrázku extrahuj údaje do JSON objektu.
Pravidla:
- date: datum vystavení / opravy ve formátu DD.MM.RRRR (pokud není čitelné, vrať prázdný řetězec).
- title: krátký výstižný název servisního úkonu česky (např. "Výměna oleje a filtrů", "Oprava brzd").
- performer: název autoservisu nebo dodavatele (pokud je uveden).
- odometer: stav tachometru v km jako celé číslo (pokud je na faktuře uveden, jinak null).
- partsSummary: stručný seznam vyměněných dílů a položek oddělený čárkou.
- materialPriceCzK: součet ceny dílů / materiálu v Kč (celé číslo, pokud nelze rozlišit od práce, dej 0).
- laborPriceCzK: cena práce mechanika v Kč (celé číslo, pokud není uvedena zvlášť, dej 0).
- totalPriceCzK: celková fakturovaná částka k úhradě v Kč (celé číslo).`;

const STK_PROMPT = `Jsi přesný OCR asistent pro české protokoly o technické prohlídce (STK) a osvědčení o registraci vozidla.
Z přiloženého obrázku extrahuj:
- stkExpirationDate: datum příští technické prohlídky / vypršení platnosti STK ve formátu DD.MM.RRRR (pokud není čitelné, prázdný řetězec).
- vin: 17místný VIN kód vozidla velkými písmeny bez mezer (pokud není čitelný, prázdný řetězec).`;

const INSURANCE_PROMPT = `Jsi přesný OCR asistent pro české zelené karty a pojistné smlouvy povinného ručení vozidel.
Z přiloženého obrázku extrahuj:
- insuranceExpirationDate: datum konce platnosti pojištění / zelené karty (platnost DO) ve formátu DD.MM.RRRR (pokud není čitelné, prázdný řetězec).`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Chybí autorizační hlavička.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Neplatná uživatelská relace.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Na serveru není nastavený GEMINI_API_KEY (Supabase Edge Function Secret).',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body: AnalyzeRequest = await req.json();
    if (!body.imageBase64) {
      return new Response(JSON.stringify({ error: 'Chybí obrazová data (imageBase64).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const docType: 'invoice' | 'stk' | 'insurance' =
      body.documentType === 'stk'
        ? 'stk'
        : body.documentType === 'insurance'
          ? 'insurance'
          : 'invoice';
    const mimeType = body.mimeType || 'image/jpeg';
    const prompt =
      docType === 'stk'
        ? STK_PROMPT
        : docType === 'insurance'
          ? INSURANCE_PROMPT
          : INVOICE_PROMPT;

    const responseSchema =
      docType === 'stk'
        ? {
            type: 'OBJECT',
            properties: {
              stkExpirationDate: { type: 'STRING' },
              vin: { type: 'STRING' },
            },
          }
        : docType === 'insurance'
          ? {
              type: 'OBJECT',
              properties: {
                insuranceExpirationDate: { type: 'STRING' },
              },
            }
          : {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                date: { type: 'STRING' },
                odometer: { type: 'INTEGER', nullable: true },
                performer: { type: 'STRING' },
                partsSummary: { type: 'STRING' },
                materialPriceCzK: { type: 'INTEGER' },
                laborPriceCzK: { type: 'INTEGER' },
                totalPriceCzK: { type: 'INTEGER' },
              },
            };

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: body.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      },
    });

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.8-flash-lite',
      'gemini-3.5-flash',
      'gemini-3-flash',
      'gemini-2.5-flash',
    ];
    let geminiRes: Response | null = null;
    let lastErrText = '';
    let bestStatus = 502;
    let bestErrText = '';

    const tryModel = async (modelName: string): Promise<Response | null> => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
        if (res.ok) {
          return res;
        }
        lastErrText = await res.text();
        console.error(`Gemini API error (${modelName}, attempt ${attempt + 1}):`, res.status, lastErrText);

        if (res.status !== 404 || !bestErrText) {
          bestStatus = res.status;
          bestErrText = lastErrText;
        }

        if ((res.status === 503 || res.status === 429) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return res;
      }
      return null;
    };

    for (const modelName of modelsToTry) {
      const res = await tryModel(modelName);
      if (res?.ok) {
        geminiRes = res;
        break;
      }
      if (res && res.status !== 404 && res.status !== 429 && res.status !== 503) {
        geminiRes = res;
        break;
      }
    }

    // If all static model names failed with 404/503, dynamically discover available Flash models
    if (!geminiRes || !geminiRes.ok) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
        );
        if (listRes.ok) {
          const listJson = await listRes.json();
          const availableFlash: string[] = (listJson.models || [])
            .filter(
              (m: any) =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes('generateContent') &&
                typeof m.name === 'string' &&
                m.name.includes('flash') &&
                !modelsToTry.includes(m.name.replace('models/', '')),
            )
            .map((m: any) => m.name.replace('models/', ''))
            .slice(0, 3);

          for (const modelName of availableFlash) {
            const res = await tryModel(modelName);
            if (res?.ok) {
              geminiRes = res;
              break;
            }
          }
        }
      } catch (discoverErr) {
        console.warn('Model discovery failed:', discoverErr);
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const status = bestStatus || geminiRes?.status || 502;
      const errDetail = bestErrText || lastErrText;
      const friendlyMsg =
        status === 503
          ? 'Služba Google Gemini je momentálně dočasně přetížená (503). Zkuste to prosím za několik sekund znovu.'
          : `Chyba Gemini API (${status}): ${errDetail.slice(0, 220)}`;
      return new Response(
        JSON.stringify({
          error: friendlyMsg,
        }),
        {
          status: status === 503 ? 503 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'AI nevrátila žádná strukturovaná data.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(rawText);
    return new Response(JSON.stringify({ data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Neočekávaná chyba serveru.';
    console.error('analyze-document error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
