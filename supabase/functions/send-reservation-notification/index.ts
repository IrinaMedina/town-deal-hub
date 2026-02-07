import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReservationRequest {
  offerId: string;
  subscriberName: string;
  subscriberEmail: string;
  subscriberPhone?: string;
  message?: string;
}

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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { offerId, subscriberName, subscriberEmail, subscriberPhone, message }: ReservationRequest = await req.json();

    // Validate required fields
    if (!offerId || !subscriberName || !subscriberEmail) {
      throw new Error("Missing required fields: offerId, subscriberName, subscriberEmail");
    }

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
              <p>Hola <strong>${publisherName}</strong>,</p>
              <p>Un suscriptor ha mostrado interés en tu oferta:</p>
              
              <div class="offer-card">
                <h3 style="margin: 0 0 10px 0;">${offer.title}</h3>
                <p class="price">${offer.price.toFixed(2)}€</p>
                <p style="margin: 5px 0;"><strong>Tienda:</strong> ${offer.store_name}</p>
                <p style="margin: 5px 0;"><strong>Población:</strong> ${offer.town}</p>
              </div>
              
              <div class="subscriber-info">
                <h3 style="margin: 0 0 15px 0;">📧 Datos del interesado</h3>
                <p><span class="label">Nombre:</span> ${subscriberName}</p>
                <p><span class="label">Email:</span> <a href="mailto:${subscriberEmail}">${subscriberEmail}</a></p>
                ${subscriberPhone ? `<p><span class="label">Teléfono:</span> <a href="tel:${subscriberPhone}">${subscriberPhone}</a></p>` : ""}
                ${message ? `<p><span class="label">Mensaje:</span></p><p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">${message}</p>` : ""}
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
