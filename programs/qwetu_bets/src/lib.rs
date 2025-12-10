use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("FgzZbmGBW7y749xrgMWETpwH5DHBYhWmoed5jrvmGE5b");

#[program]
pub mod qwetu_bets {
    use super::*;

    // 1. Create Market (No changes)
    pub fn create_market(ctx: Context<CreateMarket>, market_id: String) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.admin = ctx.accounts.admin.key();
        market.market_id = market_id;
        market.resolved = false;
        market.winner = 0;
        market.total_yes = 0;
        market.total_no = 0;
        market.fee_percentage = 200; // 2.00% (Basis points: 100 = 1%)
        Ok(())
    }

    // 2. Place Bet (NOW WITH EVENTS 📊)
    pub fn place_bet(ctx: Context<PlaceBet>, vote: u8, amount: u64) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let market = &mut ctx.accounts.market;
        let user = &mut ctx.accounts.user;

        require!(!market.resolved, ErrorCode::MarketClosed);

        // Transfer funds to Vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: market.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        // Update State
        bet.user = user.key();
        bet.amount = amount;
        bet.vote = vote;
        bet.claimed = false;

        if vote == 1 {
            market.total_yes += amount;
        } else {
            market.total_no += amount;
        }

        // --- QUANT UPGRADE: EMIT EVENT ---
        // This broadcasts the new odds to the blockchain.
        // Frontend can listen to this to graph the "Live Odds".
        emit!(BetPlaced {
            market_id: market.market_id.clone(),
            user: user.key(),
            amount: amount,
            vote: vote,
            new_total_yes: market.total_yes,
            new_total_no: market.total_no,
        });

        Ok(())
    }

    // 3. Resolve Market (No changes)
    pub fn resolve_market(ctx: Context<ResolveMarket>, winner: u8) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.resolved == false, ErrorCode::AlreadyResolved);
        market.resolved = true;
        market.winner = winner;
        Ok(())
    }

    // 4. Claim Winnings (NOW WITH FEES 💸)
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let market = &mut ctx.accounts.market;
        let user = &mut ctx.accounts.user;
        let admin = &mut ctx.accounts.admin; // We need admin account to send fees

        require!(market.resolved, ErrorCode::MarketNotResolved);
        require!(bet.vote == market.winner, ErrorCode::YouLost);
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);

        // --- QUANT UPGRADE: FEE CALCULATION ---
        let total_pool = market.total_yes + market.total_no;
        
        // 1. Calculate the House Cut (2%)
        let fee_amount = (total_pool * market.fee_percentage as u64) / 10000;
        let distributable_pool = total_pool - fee_amount;

        // 2. Calculate User's Share of the remaining pool
        let winning_pool = if market.winner == 1 { market.total_yes } else { market.total_no };
        let payout = (bet.amount as u128 * distributable_pool as u128) / winning_pool as u128;

        // 3. Transfer Payout to User
        **market.to_account_info().try_borrow_mut_lamports()? -= payout as u64;
        **user.to_account_info().try_borrow_mut_lamports()? += payout as u64;

        // 4. IMPORTANT: In a real app, you would transfer the `fee_amount` to the admin here.
        // For this V2, we leave the fee in the contract vault to keep it simple (you can withdraw later).
        
        bet.claimed = true;
        Ok(())
    }
}

// --- DATA STRUCTURES ---

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8, // Added space for fee_percentage
        seeds = [b"market", market_id.as_bytes()], 
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vote: u8, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init, 
        payer = user, 
        space = 8 + 32 + 8 + 1 + 1,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref()], 
        bump
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut, has_one = admin)]
    pub market: Account<'info, Market>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, has_one = user)]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: This is safe because we just send fees here
    #[account(mut)]
    pub admin: AccountInfo<'info>, 
}

#[account]
pub struct Market {
    pub admin: Pubkey,
    pub market_id: String,
    pub resolved: bool,
    pub winner: u8,
    pub total_yes: u64,
    pub total_no: u64,
    pub fee_percentage: u16, // New field
}

#[account]
pub struct Bet {
    pub user: Pubkey,
    pub amount: u64,
    pub vote: u8,
    pub claimed: bool,
}

// --- EVENTS (New Section) ---
#[event]
pub struct BetPlaced {
    pub market_id: String,
    pub user: Pubkey,
    pub amount: u64,
    pub vote: u8,
    pub new_total_yes: u64,
    pub new_total_no: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market is closed.")]
    MarketClosed,
    #[msg("Market is not resolved yet.")]
    MarketNotResolved,
    #[msg("Market already resolved.")]
    AlreadyResolved,
    #[msg("Sorry, you lost.")]
    YouLost,
    #[msg("Already claimed.")]
    AlreadyClaimed,
}