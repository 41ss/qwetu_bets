use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("FgzZbmGBW7y749xrgMWETpwH5DHBYhWmoed5jrvmGE5b");

#[program]
pub mod qwetu_bets {
    use super::*;

    pub fn create_market(ctx: Context<CreateMarket>, market_id: String) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.admin = ctx.accounts.admin.key();
        market.market_id = market_id;
        market.resolved = false;
        market.winner = 0;
        market.total_yes = 0;
        market.total_no = 0;
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, vote: u8, amount: u64) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let market = &mut ctx.accounts.market;
        let user = &mut ctx.accounts.user;

        require!(!market.resolved, ErrorCode::MarketClosed);

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: market.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        bet.user = user.key();
        bet.amount = amount;
        bet.vote = vote;
        bet.claimed = false;

        if vote == 1 {
            market.total_yes += amount;
        } else {
            market.total_no += amount;
        }

        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, winner: u8) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.resolved == false, ErrorCode::AlreadyResolved);
        
        market.resolved = true;
        market.winner = winner;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let market = &mut ctx.accounts.market;
        let user = &mut ctx.accounts.user;

        require!(market.resolved, ErrorCode::MarketNotResolved);
        require!(bet.vote == market.winner, ErrorCode::YouLost);
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);

        let total_pool = market.total_yes + market.total_no;
        let winning_pool = if market.winner == 1 { market.total_yes } else { market.total_no };
        
        let payout = (bet.amount as u128 * total_pool as u128) / winning_pool as u128;

        **market.to_account_info().try_borrow_mut_lamports()? -= payout as u64;
        **user.to_account_info().try_borrow_mut_lamports()? += payout as u64;

        bet.claimed = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 32 + 1 + 1 + 8 + 8,
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
}

#[account]
pub struct Market {
    pub admin: Pubkey,
    pub market_id: String,
    pub resolved: bool,
    pub winner: u8,
    pub total_yes: u64,
    pub total_no: u64,
}

#[account]
pub struct Bet {
    pub user: Pubkey,
    pub amount: u64,
    pub vote: u8,
    pub claimed: bool,
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
