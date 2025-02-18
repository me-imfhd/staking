use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::{RewardPool, StakePool};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct AddRewardPool<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  pub authority: Signer<'info>,
  pub reward_mint: Account<'info, Mint>,
  #[account(
    mut, 
    has_one = authority @ ErrorCode::InvalidAuthority,
    constraint = stake_pool.load()?.reward_pools[usize::from(index)].reward_vault == Pubkey::default() 
      @ ErrorCode::RewardPoolIndexOccupied,
  )]
  pub stake_pool: AccountLoader<'info, StakePool>,
  #[account(
    init,
    seeds = [stake_pool.key().as_ref(), reward_mint.key().as_ref(), b"rewardVault"],
    bump,
    payer = payer,
    token::mint = reward_mint,
    token::authority = stake_pool,
  )]
  pub reward_vault: Account<'info, TokenAccount>,

  pub token_program: Program<'info, Token>,
  pub rent: Sysvar<'info, Rent>,
  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddRewardPool>, index: u8) -> Result<()> {
  let mut stake_pool = ctx.accounts.stake_pool.load_mut()?;
  let reward_pool = RewardPool::new(&ctx.accounts.reward_vault.key());
  stake_pool.reward_pools[usize::from(index)] = reward_pool;

  Ok(())
}