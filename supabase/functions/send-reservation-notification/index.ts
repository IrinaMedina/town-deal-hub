import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
const ReservationRequestSchema = z.object({
  offerId: z.string().uuid("Invalid offer ID format"),
  subscriberName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").trim(),
  subscriberEmail: z.string().email("Invalid email format").max(255, "Email too long"),
  subscriberPhone: z.string().max(20, "Phone number too long").optional().transform(val => val?.trim()),
  message: z.string().max(1000, "Message too long").optional().transform(val => val?.trim()),
});

type ReservationRequest = z.infer<typeof ReservationRequestSchema>;

// HTML escape function to prevent injection in emails
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Parse and validate input
    let validatedData: ReservationRequest;
    try {
      const requestBody = await req.json();
      validatedData = ReservationRequestSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return new Response(
          JSON.stringify({ error: "Invalid input", details: error.errors }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      throw error;
    }

    const { offerId, subscriberName, subscriberEmail, subscriberPhone, message } = validatedData;

    // Get offer details
    const { data: offer, error: offerError } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      console.error("Error fetching offer:", offerError);
      throw new Error("Offer not found");
    }

    // Get publisher profile
    const { data: publisherProfile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("user_id", offer.created_by)
      .maybeSingle();

    // Get publisher email from auth.users
    const { data: publisherAuth, error: publisherAuthError } = await supabaseAdmin.auth.admin.getUserById(offer.created_by);
    
    if (publisherAuthError || !publisherAuth?.user?.email) {
      console.error("Error fetching publisher:", publisherAuthError);
      throw new Error("Publisher email not found");
    }

    const publisherEmail = publisherAuth.user.email;
    const publisherName = publisherProfile?.name || "Publicador";

    // Create reservation record
    const { data: reservation, error: reservationError } = await supabaseClient
      .from("reservations")
      .insert({
        offer_id: offerId,
        subscriber_id: user.id,
        subscriber_name: subscriberName,
        subscriber_email: subscriberEmail,
        subscriber_phone: subscriberPhone || null,
        message: message || null,
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Error creating reservation:", reservationError);
      throw new Error("Failed to create reservation");
    }

    console.log("Reservation created:", reservation.id);

    // Send email notification to publisher
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
            .offer-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .price { font-size: 24px; font-weight: bold; color: #667eea; }
            .subscriber-info { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .label { font-weight: 600; color: #666; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 ¡Nueva Reserva!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Has recibido una reserva para tu oferta</p>
            </div>
            <div class="content">
              <p>Hola <strong>${escapeHtml(publisherName)}</strong>,</p>
              <p>Un suscriptor ha mostrado interés en tu oferta:</p>
              
              <div class="offer-card">
                <h3 style="margin: 0 0 10px 0;">${escapeHtml(offer.title)}</h3>
                <p class="price">${offer.price.toFixed(2)}€</p>
                <p style="margin: 5px 0;"><strong>Tienda:</strong> ${escapeHtml(offer.store_name)}</p>
                <p style="margin: 5px 0;"><strong>Población:</strong> ${escapeHtml(offer.town)}</p>
              </div>
              
              <div class="subscriber-info">
                <h3 style="margin: 0 0 15px 0;">📧 Datos del interesado</h3>
                <p><span class="label">Nombre:</span> ${escapeHtml(subscriberName)}</p>
                <p><span class="label">Email:</span> <a href="mailto:${encodeURIComponent(subscriberEmail)}">${escapeHtml(subscriberEmail)}</a></p>
                ${subscriberPhone ? `<p><span class="label">Teléfono:</span> <a href="tel:${encodeURIComponent(subscriberPhone)}">${escapeHtml(subscriberPhone)}</a></p>` : ""}
                ${message ? `<p><span class="label">Mensaje:</span></p><p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">${escapeHtml(message)}</p>` : ""}
              </div>
              
              <p style="margin-top: 20px;">Te recomendamos ponerte en contacto con el interesado lo antes posible.</p>
              
              <div class="footer">
                <p>Este email fue enviado desde Publicitta</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendDomain = Deno.env.get("RESEND_DOMAIN") || "resend.dev";
    const { error: emailError } = await resend.emails.send({
      from: `Publicitta <noreply@${resendDomain}>`,
      to: [publisherEmail],
      subject: `🛒 Nueva reserva: ${offer.title}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the reservation if email fails, just log it
    } else {
      console.log("Email notification sent to:", publisherEmail);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reservationId: reservation.id,
        message: "Reserva creada correctamente" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-reservation-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
