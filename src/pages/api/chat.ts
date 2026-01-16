
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Validar input
    const body = await request.json();
    const { message, currentUrl } = body;

    if (!message) {
      return new Response(JSON.stringify({ message: 'Mensaje vacío' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. Configuración
    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-chat-box";
    // ... (rest of config)
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    // 3. Preparar Headers
    const origin = new URL(request.url).origin;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Origin": origin
    };

    // Si existe el secreto, añadimos autenticación. 
    // NOTA: Si n8n está configurado sin auth, esto podría causar problemas si el servidor rechaza headers extraños,
    // pero standard es ignorarlos o usarlos. Asumimos Header Auth standard "Authorization: Bearer <token>".
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }

    // Generar userId (hash de IP)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
    
    // Simple hash function for the IP to avoid sending raw IP
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const userId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. Llamada a n8n
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        question: message,
        url: currentUrl || origin, // Fallback to origin if path not sent
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'veredillas-fm-web',
          userAgent: request.headers.get('user-agent')
        }
      })
    });

    // 5. Manejo de Errores Upstream
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chat API] Error ${response.status} from n8n:`, errorText);
      
      // Intentar parsear si es JSON para dar un mensaje mejor
      let clientMessage = "Error de comunicación con el asistente.";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) clientMessage = errorJson.message;
      } catch (e) {
        // Si es texto plano (ej: 404 Not Found, 403 Forbidden)
        if (response.status === 403) clientMessage = "Error de autorización con el servidor de IA.";
        if (response.status === 404) clientMessage = "El servicio de IA no está disponible en este momento.";
      }

      return new Response(JSON.stringify({ message: clientMessage, debug: errorText }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 6. Procesar Respuesta Exitosa
    // n8n suele devolver un JSON directo, pero a veces envía texto plano si algo falla internamente o se configura mal.
    let data;
    try {
        const textData = await response.text();
        try {
            data = JSON.parse(textData);
        } catch (e) {
            // Si no es JSON, asumir que es texto plano
            data = { output: textData };
        }
    } catch (e) {
        console.error("Error leyendo respuesta de n8n:", e);
        data = { output: "Error al leer respuesta del servidor." };
    }
    
    // Normalizar la respuesta para el frontend
    // Buscamos 'output', 'text', 'message' o devolvemos todo el objeto
    let responseText = "";
    
    if (typeof data === 'string') {
        responseText = data;
    } else if (data && data.output) {
        responseText = data.output;
    } else if (data && data.text) {
        responseText = data.text;
    } else if (data && data.message) {
        responseText = data.message;
    } else if (Array.isArray(data) && data[0]?.output) {
        responseText = data[0].output;
    } else {
        responseText = JSON.stringify(data); // Fallback: ver qué devolvió
    }

    return new Response(JSON.stringify({ response: responseText }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("[Chat API] Internal Error:", error);
    return new Response(JSON.stringify({ message: "Error interno del servidor." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
