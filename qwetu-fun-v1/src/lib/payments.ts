
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export const initiateDeposit = async (amount: number, phone: string, authId: string, onSuccess?: () => void) => {
    try {
        // 1. Get User ID from Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, balance_kes')
            .eq('auth_id', authId)
            .single();

        if (userError || !user) throw new Error("User not found");

        // 2. Insert pending transaction via RPC
        const { data: transactionId, error } = await supabase.rpc('create_mpesa_deposit', {
            p_amount: amount,
            p_phone: phone,
            p_auth_id: authId
        });

        if (error) {
            toast.error("Deposit Request Failed");
            throw error;
        }

        toast.success("M-Pesa STK Push Sent!");

        // 3. DEV MODE: Simulate Completion after 5 seconds
        // IMPORTANT: RPC should return the new Transaction ID for this to work
        if (transactionId) {
            setTimeout(async () => {
                try {
                    // Update transaction status
                    const { error: updateError } = await supabase
                        .from('transactions')
                        .update({ status: 'COMPLETED' })
                        .eq('id', transactionId);

                    if (updateError) throw updateError;

                    // Increment user balance
                    const newBalance = (user.balance_kes || 0) + amount;

                    const { error: balanceError } = await supabase
                        .from('users')
                        .update({ balance_kes: newBalance })
                        .eq('id', user.id);

                    if (balanceError) throw balanceError;

                    toast.success(`Deposit Confirmed! +${amount} KES`);
                    if (onSuccess) onSuccess();

                } catch (err) {
                    console.error("Simulation Error", err);
                    // toast.error("Simulation Failed"); // Suppress to avoid confusion if RPC didn't return ID
                }
            }, 5000);
        }

    } catch (error) {
        console.error("Deposit Error:", error);
        toast.error("Deposit Failed to Initiate");
        throw error;
    }
};
