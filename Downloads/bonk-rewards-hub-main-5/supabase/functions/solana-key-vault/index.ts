import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Solana imports
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.98.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Enhanced Solana Key Vault Management
class SecureSolanaKeyVault {
  private connection: Connection;
  private supabase: any;
  
  constructor(rpcUrl: string, supabaseClient: any) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.supabase = supabaseClient;
  }

  // Hardware Security Module simulation using secure key derivation
  private async deriveSecureKey(
    masterSeed: string, 
    derivationPath: string, 
    userId: string
  ): Promise<Keypair> {
    // Use Web Crypto API for secure key derivation (HSM simulation)
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterSeed + derivationPath + userId),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode('solana-bonk-secure-vault'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes for Solana private key
    );

    const secretKey = new Uint8Array(derivedBits);
    return Keypair.fromSecretKey(secretKey);
  }

  // Get the active keypair with rotation support
  async getActiveKeypair(userId: string): Promise<{ keypair: Keypair; version: number; publicKey: string }> {
    try {
      // Check for user-specific key rotation status
      const { data: keyStatus } = await this.supabase
        .from('solana_key_vault')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let version = keyStatus?.version || 1;
      let derivationPath = keyStatus?.derivation_path || 'default';

      // If no active key exists, create one
      if (!keyStatus) {
        await this.createNewKeyVersion(userId, version, derivationPath);
      }

      const masterSeed = Deno.env.get('SOLANA_PRIVATE_KEY') || '';
      const keypair = await this.deriveSecureKey(masterSeed, derivationPath, userId);

      return {
        keypair,
        version,
        publicKey: keypair.publicKey.toString()
      };
    } catch (error) {
      console.error('Error getting active keypair:', error);
      throw new Error('Failed to retrieve secure keypair');
    }
  }

  // Create new key version for rotation
  private async createNewKeyVersion(
    userId: string, 
    version: number, 
    derivationPath: string
  ): Promise<void> {
    const timestamp = Date.now();
    const newDerivationPath = `${derivationPath}_v${version}_${timestamp}`;
    
    await this.supabase
      .from('solana_key_vault')
      .insert({
        user_id: userId,
        version: version,
        derivation_path: newDerivationPath,
        is_active: true,
        created_at: new Date().toISOString(),
        last_rotation: new Date().toISOString()
      });

    // Log security event
    await this.logSecurityEvent(userId, 'key_version_created', {
      version,
      derivation_path: newDerivationPath,
      timestamp
    });
  }

  // Rotate keys (create new version and migrate if needed)
  async rotateKey(userId: string, reason: string = 'scheduled_rotation'): Promise<{
    oldVersion: number;
    newVersion: number;
    newPublicKey: string;
  }> {
    try {
      // Get current active key
      const currentKey = await this.getActiveKeypair(userId);
      const newVersion = currentKey.version + 1;

      // Deactivate old key
      await this.supabase
        .from('solana_key_vault')
        .update({ is_active: false, rotated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('version', currentKey.version);

      // Create new key version
      await this.createNewKeyVersion(userId, newVersion, `rotated_${reason}`);

      // Get new keypair
      const newKey = await this.getActiveKeypair(userId);

      // Log rotation event
      await this.logSecurityEvent(userId, 'key_rotated', {
        old_version: currentKey.version,
        new_version: newVersion,
        reason,
        old_public_key: currentKey.publicKey,
        new_public_key: newKey.publicKey
      });

      return {
        oldVersion: currentKey.version,
        newVersion: newVersion,
        newPublicKey: newKey.publicKey
      };
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Failed to rotate keys');
    }
  }

  // Multi-signature validation for large transfers
  async validateMultiSigRequirement(
    userId: string, 
    amount: number, 
    signatures: string[] = []
  ): Promise<{ 
    required: boolean; 
    threshold: number; 
    provided: number; 
    approved: boolean;
    missingSignatures?: string[];
  }> {
    // Define thresholds for multi-sig requirements
    const LARGE_TRANSFER_THRESHOLD = 50000; // 50k BONK tokens
    const CRITICAL_TRANSFER_THRESHOLD = 100000; // 100k BONK tokens

    let requiredSignatures = 1; // Default: single signature
    
    if (amount >= CRITICAL_TRANSFER_THRESHOLD) {
      requiredSignatures = 3; // Critical: requires 3 signatures
    } else if (amount >= LARGE_TRANSFER_THRESHOLD) {
      requiredSignatures = 2; // Large: requires 2 signatures
    }

    const isMultiSigRequired = requiredSignatures > 1;
    
    if (!isMultiSigRequired) {
      return {
        required: false,
        threshold: 1,
        provided: 1,
        approved: true
      };
    }

    // Check existing approvals for this user and amount
    const { data: approvals } = await this.supabase
      .from('transfer_approvals')
      .select('approver_role, signature, created_at')
      .eq('user_id', userId)
      .eq('amount', amount)
      .eq('status', 'approved')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    const providedSignatures = approvals?.length || 0;
    const isApproved = providedSignatures >= requiredSignatures;

    // Determine missing signature types
    const existingRoles = new Set(approvals?.map(a => a.approver_role) || []);
    const requiredRoles = ['admin', 'security_officer', 'compliance_officer'];
    const missingRoles = requiredRoles.filter(role => !existingRoles.has(role))
      .slice(0, requiredSignatures - providedSignatures);

    return {
      required: true,
      threshold: requiredSignatures,
      provided: providedSignatures,
      approved: isApproved,
      missingSignatures: missingRoles
    };
  }

  // Log security events
  private async logSecurityEvent(
    userId: string, 
    eventType: string, 
    metadata: any
  ): Promise<void> {
    await this.supabase
      .from('security_audit_log')
      .insert({
        user_id: userId,
        event_type: eventType,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        source: 'solana_key_vault'
      });
  }

  // Check key health and rotation schedule
  async checkKeyHealth(userId: string): Promise<{
    needsRotation: boolean;
    lastRotation: string | null;
    daysSinceRotation: number;
    recommendation: string;
  }> {
    const { data: keyInfo } = await this.supabase
      .from('solana_key_vault')
      .select('last_rotation, version')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    const lastRotation = keyInfo?.last_rotation;
    const daysSinceRotation = lastRotation 
      ? Math.floor((Date.now() - new Date(lastRotation).getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    const needsRotation = daysSinceRotation > 90; // Rotate every 90 days

    let recommendation = 'Key is healthy';
    if (daysSinceRotation > 90) {
      recommendation = 'Immediate rotation required (>90 days)';
    } else if (daysSinceRotation > 60) {
      recommendation = 'Rotation recommended soon (>60 days)';
    } else if (daysSinceRotation > 30) {
      recommendation = 'Monitor key age (>30 days)';
    }

    return {
      needsRotation,
      lastRotation,
      daysSinceRotation,
      recommendation
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    // Initialize secure key vault
    const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
    const keyVault = new SecureSolanaKeyVault(SOLANA_RPC, supabase);

    // Route different security operations
    switch (action) {
      case 'rotate-key': {
        const { reason } = await req.json();
        
        // Verify admin permissions for key rotation
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'Admin privileges required for key rotation' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await keyVault.rotateKey(user.id, reason);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Key rotation completed successfully',
            oldVersion: result.oldVersion,
            newVersion: result.newVersion,
            newPublicKey: result.newPublicKey
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-health': {
        const health = await keyVault.checkKeyHealth(user.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            health: health
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate-multisig': {
        const { amount, signatures } = await req.json();
        
        const validation = await keyVault.validateMultiSigRequirement(
          user.id, 
          amount, 
          signatures
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            multiSigValidation: validation
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-key-info': {
        const keyInfo = await keyVault.getActiveKeypair(user.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            keyInfo: {
              version: keyInfo.version,
              publicKey: keyInfo.publicKey,
              // Never expose the private key
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Available: rotate-key, check-health, validate-multisig, get-key-info' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in solana-key-vault function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});