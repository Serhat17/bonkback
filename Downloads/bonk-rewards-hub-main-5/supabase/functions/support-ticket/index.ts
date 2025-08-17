import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketRequest {
  action: 'create' | 'update' | 'add_message' | 'list';
  ticket_id?: string;
  subject?: string;
  description?: string;
  message?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'general' | 'account' | 'payment' | 'technical' | 'billing' | 'security';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  customer_email?: string;
  customer_name?: string;
  is_internal?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data }: TicketRequest = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    let user_id: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      user_id = user?.id || null;
    }

    console.log("Processing support ticket action:", { action, user_id });

    switch (action) {
      case 'create': {
        if (!data.subject || !data.description) {
          throw new Error('Subject and description are required');
        }

        const { data: ticket, error } = await supabase
          .from('support_tickets')
          .insert({
            user_id,
            subject: data.subject,
            description: data.description,
            priority: data.priority || 'medium',
            category: data.category || 'general',
            customer_email: data.customer_email,
            customer_name: data.customer_name,
            status: 'open'
          })
          .select()
          .single();

        if (error) throw error;

        // Send welcome notification
        if (user_id) {
          try {
            await supabase.functions.invoke('send-notification-email', {
              body: {
                user_id,
                template_name: 'support_ticket_created',
                variables: {
                  subject: data.subject,
                  ticket_id: ticket.id
                }
              }
            });
          } catch (emailError) {
            console.warn("Failed to send ticket creation email:", emailError);
          }
        }

        return new Response(JSON.stringify({ success: true, ticket }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case 'add_message': {
        if (!data.ticket_id || !data.message) {
          throw new Error('Ticket ID and message are required');
        }

        const { data: message, error } = await supabase
          .from('support_ticket_messages')
          .insert({
            ticket_id: data.ticket_id,
            user_id,
            message: data.message,
            is_internal: data.is_internal || false
          })
          .select()
          .single();

        if (error) throw error;

        // Update ticket timestamp
        await supabase
          .from('support_tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data.ticket_id);

        return new Response(JSON.stringify({ success: true, message }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case 'update': {
        if (!data.ticket_id) {
          throw new Error('Ticket ID is required');
        }

        const updates: any = {};
        if (data.status) updates.status = data.status;
        if (data.priority) updates.priority = data.priority;
        if (data.status === 'resolved') updates.resolved_at = new Date().toISOString();

        const { data: ticket, error } = await supabase
          .from('support_tickets')
          .update(updates)
          .eq('id', data.ticket_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, ticket }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case 'list': {
        let query = supabase
          .from('support_tickets')
          .select(`
            *,
            support_ticket_messages (
              id,
              message,
              is_internal,
              created_at,
              user_id
            )
          `)
          .order('created_at', { ascending: false });

        // Filter by user if not admin
        if (user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user_id)
            .single();

          if (profile?.role !== 'admin') {
            query = query.eq('user_id', user_id);
          }
        }

        const { data: tickets, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, tickets }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error("Error in support-ticket function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);