use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod macros;
pub mod math;
pub mod state;

use crate::instructions::*;

declare_id!("ALRPAsu4Aqmb8VCVcnjFQo5XF2K8MCDGmTECvZw4YJVY");

#[program]
pub mod alris_staking {
    use super::*;

    pub fn initialize_stake_pool(
        ctx: Context<InitializeStakePool>,
        nonce: u8,
        max_weight: u64,
        min_duration: u64,
        max_duration: u64,
    ) -> Result<()> {
        initialize_stake_pool::handler(ctx, nonce, max_weight, min_duration, max_duration)
    }

    pub fn transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
        transfer_authority::handler(ctx)
    }

    pub fn dangerously_mint_lp(ctx: Context<DangerouslyMintLp>, amount: u64) -> Result<()> {
        dangerously_mint_lp::handler(ctx, amount)
    }

    pub fn add_reward_pool(ctx: Context<AddRewardPool>, index: u8) -> Result<()> {
        add_reward_pool::handler(ctx, index)
    }

    pub fn set_flags(ctx: Context<SetFlags>, flags: u8) -> Result<()> {
        set_flags::handler(ctx, flags)
    }

    pub fn deposit<'info>(
        ctx: Context<'_, '_, 'info, 'info, Deposit<'info>>,
        nonce: u32,
        amount: u64,
        lockup_duration: u64,
    ) -> Result<()> {
        deposit::handler(ctx, nonce, amount, lockup_duration)
    }

    pub fn claim_all<'info>(ctx: Context<'_, '_, 'info, 'info, ClaimAll<'info>>) -> Result<()> {
        claim_all::handler(ctx)
    }

    pub fn withdraw<'info>(ctx: Context<'_, '_, 'info, 'info, Withdraw<'info>>) -> Result<()> {
        withdraw::handler(ctx)
    }

    pub fn update_token_meta(
        ctx: Context<UpdateTokenMeta>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        update_token_meta::handler(ctx, name, symbol, uri)
    }
}
