import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Solana imports
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction
} from 'https://esm.sh/@solana/web3.js@1.98.4';
import { 
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID
} from 'https://esm.sh/@solana/spl-token@0.4.13';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Enhanced Solana configuration
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const BONK_MINT = new PublicKey(Deno.env.get('BONK_TOKEN_MINT') || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
const BONK_DECIMALS = 5;

// Enhanced secure key derivation (HSM simulation)
async function getSecureKeypair(userId: string, derivationPath: string = 'default'): Promise<Keypair> {
  const masterSeed = Deno.env.get('SOLANA_PRIVATE_KEY') || '';
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
      salt: encoder.encode('bonk-transfer-secure-vault'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const secretKey = new Uint8Array(derivedBits);
  return Keypair.fromSecretKey(secretKey);
}

// Enhanced multi-signature validation
async function validateMultiSigTransfer(
  supabase: any,
  userId: string,
  amount: number,
  walletAddress: string
): Promise<{ approved: boolean; reason?: string; requiredSignatures?: number }> {
  const LARGE_TRANSFER_THRESHOLD = 50000; // 50k BONK
  const CRITICAL_TRANSFER_THRESHOLD = 100000; // 100k BONK
  
  let requiredSignatures = 1;
  
  if (amount >= CRITICAL_TRANSFER_THRESHOLD) {
    requiredSignatures = 3;
  } else if (amount >= LARGE_TRANSFER_THRESHOLD) {
    requiredSignatures = 2;
  }

  if (requiredSignatures === 1) {
    return { approved: true };
  }

  // Check for existing approvals
  const { data: approvals, error } = await supabase
    .from('transfer_approvals')
    .select('id, approver_role, signature')
    .eq('user_id', userId)
    .eq('amount', amount)
    .eq('wallet_address', walletAddress)
    .eq('status', 'approved')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Error checking approvals:', error);
    return { approved: false, reason: 'Unable to verify approvals' };
  }

  const approvalCount = approvals?.length || 0;
  
  if (approvalCount < requiredSignatures) {
    return { 
      approved: false, 
      reason: `Multi-signature required: ${approvalCount}/${requiredSignatures} approvals`,
      requiredSignatures
    };
  }

  return { approved: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    const { amount, walletAddress, sourceType = 'manual', sourceId } = await req.json();

    console.log(`Processing enhanced secure BONK transfer for user ${user.id}`, {
      amount,
      walletAddress,
      sourceType,
      sourceId
    });

    // Validate wallet address
    let recipientPublicKey: PublicKey;
    try {
      recipientPublicKey = new PublicKey(walletAddress);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid Solana wallet address' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced multi-signature validation
    const multiSigValidation = await validateMultiSigTransfer(
      supabase, 
      user.id, 
      amount, 
      walletAddress
    );

    if (!multiSigValidation.approved) {
      // Create pending approval request
      await supabase
        .from('transfer_approval_requests')
        .insert({
          user_id: user.id,
          amount: amount,
          wallet_address: walletAddress,
          required_signatures: multiSigValidation.requiredSignatures,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      return new Response(
        JSON.stringify({ 
          error: 'Multi-signature approval required',
          reason: multiSigValidation.reason,
          requiredSignatures: multiSigValidation.requiredSignatures,
          message: 'Transfer request submitted for approval. Admin/Security officers will review this request.'
        }),
        { 
          status: 202, // Accepted but pending
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check standard payout eligibility
    const { data: eligibilityCheck } = await supabase
      .rpc('check_payout_eligibility', {
        _user_id: user.id,
        _amount: amount
      });

    if (!eligibilityCheck?.eligible) {
      return new Response(
        JSON.stringify({ 
          error: 'Payout not eligible', 
          reason: eligibilityCheck?.reason,
          message: eligibilityCheck?.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get active key info from key vault
    const { data: keyVaultInfo } = await supabase
      .from('solana_key_vault')
      .select('version, derivation_path, last_rotation')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const derivationPath = keyVaultInfo?.derivation_path || 'default';
    const keyVersion = keyVaultInfo?.version || 1;

    // Check if key needs rotation (security requirement)
    const lastRotation = keyVaultInfo?.last_rotation;
    const daysSinceRotation = lastRotation 
      ? Math.floor((Date.now() - new Date(lastRotation).getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    if (daysSinceRotation > 90) {
      return new Response(
        JSON.stringify({ 
          error: 'Key rotation required',
          message: 'Security policy requires key rotation before large transfers. Please contact administrator.',
          daysSinceRotation
        }),
        { 
          status: 423, // Locked
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create transfer record with enhanced security metadata
    const { data: transfer, error: transferError } = await supabase
      .from('bonk_transfers')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        amount: amount,
        source_type: sourceType,
        source_id: sourceId,
        status: 'pending',
        security_metadata: {
          key_version: keyVersion,
          derivation_path: derivationPath,
          multi_sig_validated: multiSigValidation.approved,
          key_age_days: daysSinceRotation
        }
      })
      .select()
      .single();

    if (transferError) {
      console.error('Error creating transfer record:', transferError);
      throw new Error('Failed to create transfer record');
    }

    // Perform secure BONK transfer with enhanced key management
    let txHash = null;
    let status = 'pending';
    let errorMessage = null;

    try {
      // Initialize connection
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      
      // Get secure keypair using HSM simulation
      const senderKeypair = await getSecureKeypair(user.id, derivationPath);
      
      console.log(`Secure transfer from: ${senderKeypair.publicKey.toString()}`);
      console.log(`Using key version: ${keyVersion}, path: ${derivationPath}`);

      // Get token accounts with enhanced error handling
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        BONK_MINT,
        senderKeypair.publicKey
      );

      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        BONK_MINT,
        recipientPublicKey
      );

      // Convert amount to smallest units
      const transferAmount = BigInt(Math.floor(amount * Math.pow(10, BONK_DECIMALS)));

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address,
        recipientTokenAccount.address,
        senderKeypair.publicKey,
        transferAmount,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderKeypair.publicKey;

      // Enhanced transaction signing with security logging
      txHash = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      );
      
      status = 'completed';
      console.log(`Enhanced secure BONK transfer completed: ${txHash}`);

      // Update user balance
      await supabase
        .from('profiles')
        .update({
          bonk_balance: eligibilityCheck.balance - amount
        })
        .eq('user_id', user.id);

      // Log security event for successful transfer
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'secure_transfer_completed',
          metadata: {
            amount,
            wallet_address: walletAddress,
            tx_hash: txHash,
            key_version: keyVersion,
            multi_sig_validated: true,
            key_age_days: daysSinceRotation
          },
          timestamp: new Date().toISOString(),
          source: 'enhanced_bonk_transfer'
        });

    } catch (transferError) {
      console.error('Enhanced BONK transfer failed:', transferError);
      status = 'failed';
      errorMessage = transferError.message;

      // Log security event for failed transfer
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'secure_transfer_failed',
          metadata: {
            amount,
            wallet_address: walletAddress,
            error: errorMessage,
            key_version: keyVersion
          },
          timestamp: new Date().toISOString(),
          source: 'enhanced_bonk_transfer'
        });
    }

    // Update transfer record with enhanced metadata
    const { error: updateError } = await supabase
      .from('bonk_transfers')
      .update({
        tx_hash: txHash,
        status: status,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
        security_metadata: {
          ...transfer.security_metadata,
          final_status: status,
          tx_hash: txHash,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        }
      })
      .eq('id', transfer.id);

    if (updateError) {
      console.error('Error updating transfer record:', updateError);
    }

    // Rate limiting update
    if (status === 'completed') {
      await supabase
        .from('payout_rate_limits')
        .upsert({
          user_id: user.id,
          last_payout_at: new Date().toISOString(),
          payout_count: 1
        }, {
          onConflict: 'user_id'
        });

      // Create payout event for audit trail
      await supabase
        .from('bonk_payout_events')
        .insert({
          transfer_id: transfer.id,
          user_id: user.id,
          source: sourceType,
          amount: amount,
          description: `Enhanced secure BONK transfer to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`
        });
    }

    return new Response(
      JSON.stringify({
        success: status === 'completed',
        transferId: transfer.id,
        txHash: txHash,
        status: status,
        amount: amount,
        walletAddress: walletAddress,
        security: {
          keyVersion: keyVersion,
          multiSigValidated: multiSigValidation.approved,
          keyAgeDays: daysSinceRotation
        },
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: status === 'completed' ? 200 : 500
      }
    );

  } catch (error) {
    console.error('Error in enhanced bonk-transfer function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});