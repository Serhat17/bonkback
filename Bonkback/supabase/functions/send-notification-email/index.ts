import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  template_name: string;
  variables?: Record<string, any>;
  recipient_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, template_name, variables = {}, recipient_email }: NotificationRequest = await req.json();

    console.log("Processing notification email:", { user_id, template_name });

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', template_name)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template '${template_name}' not found or inactive`);
    }

    // Get user profile for email if not provided
    let userEmail = recipient_email;
    if (!userEmail && user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user_id)
        .single();
      
      userEmail = profile?.email;
    }

    if (!userEmail) {
      throw new Error('No recipient email found');
    }

    // Process template variables
    const processTemplate = (template: string, vars: Record<string, any>) => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] || match;
      });
    };

    const subject = processTemplate(template.subject_template, variables);
    const htmlContent = processTemplate(template.html_template, variables);
    const textContent = template.text_template ? processTemplate(template.text_template, variables) : undefined;

    // Create notification record
    const { data: notification, error: insertError } = await supabase
      .from('email_notifications')
      .insert({
        user_id,
        template_name,
        recipient_email: userEmail,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        variables,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create notification record: ${insertError.message}`);
    }

    // Send email
    try {
      const emailResponse = await resend.emails.send({
        from: "BonkBack <noreply@resend.dev>",
        to: [userEmail],
        subject,
        html: htmlContent,
        text: textContent,
      });

      // Update notification status
      await supabase
        .from('email_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify({
        success: true,
        notification_id: notification.id,
        email_id: emailResponse.data?.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (emailError: any) {
      console.error("Failed to send email:", emailError);

      // Update notification with error
      await supabase
        .from('email_notifications')
        .update({
          status: 'failed',
          error_message: emailError.message,
          attempts: 1
        })
        .eq('id', notification.id);

      throw emailError;
    }

  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
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