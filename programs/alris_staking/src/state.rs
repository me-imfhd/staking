use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use bytemuck::{Pod, Zeroable};
use core::primitive;
use jet_proc_macros::assert_size;

use crate::{errors::ErrorCode, math::U192};

pub const MAX_REWARD_POOLS: usize = 10;
pub const SCALE_FACTOR_BASE: u64 = 1_000_000_000;
pub const SCALE_FACTOR_BASE_SQUARED: u64 = 1_000_000_000_000_000_000;
pub const SECONDS_PER_DAY: u64 = 60 * 60 * 24;

pub const ESCAPE_HATCH_ENABLED: u8 = 1;
pub const DISABLE_DEPOSITS: u8 = 4;
pub const DEPOSIT_IGNORES_LP: u8 = 8;
pub const WITHDRAW_IGNORES_LP: u8 = 16;

#[allow(non_camel_case_types)]
#[derive(Copy, Clone, Default, Zeroable, AnchorDeserialize, AnchorSerialize, Pod, Debug)]
#[repr(C)]
pub struct u128(pub [u8; 16]);

impl u128 {
    pub fn as_u128(&self) -> primitive::u128 {
        primitive::u128::from_le_bytes(self.0)
    }
}

pub fn get_digit_shift_by_max_scalar(max_weight: u64) -> u8 {
    let mut digit_shift = 0u32;
    while primitive::u128::from(max_weight)
        .checked_mul(primitive::u128::from(u64::MAX))
        .unwrap()
        .checked_div(primitive::u128::from(SCALE_FACTOR_BASE))
        .unwrap()
        .checked_div(primitive::u128::pow(10, digit_shift))
        .unwrap()
        .gt(&primitive::u128::from(u64::MAX))
    {
        digit_shift += 1;
    }
    digit_shift.try_into().unwrap()
}

#[assert_size(64)]
#[derive(Clone, Copy, Default, AnchorDeserialize, AnchorSerialize, Pod, Zeroable)]
#[repr(C)]
pub struct RewardPool {
    pub reward_vault: Pubkey,
    pub rewards_per_effective_stake: u128,
    pub last_amount: u64,
    _padding0: [u8; 8],
}

impl RewardPool {
    pub fn is_empty(&self) -> bool {
        self.reward_vault == Pubkey::default()
    }

    pub fn new(reward_vault: &Pubkey) -> Self {
        let mut res = Self::default();
        res.reward_vault = *reward_vault;
        res
    }

    pub fn rewards_per_effective_stake_u128(&self) -> primitive::u128 {
        self.rewards_per_effective_stake.as_u128()
    }
}

#[assert_size(1112)]
#[account(zero_copy)]
#[repr(C)]
pub struct StakePool {
    pub creator: Pubkey,
    pub authority: Pubkey,
    pub total_weighted_stake: u128,
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub stake_mint: Pubkey,
    pub reward_pools: [RewardPool; MAX_REWARD_POOLS],
    pub base_weight: u64,
    pub max_weight: u64,
    pub min_duration: u64,
    pub max_duration: u64,
    pub nonce: u8,
    pub bump_seed: u8,
    pub flags: u8,
    _padding0: [u8; 5],
    _reserved0: [u8; 256],
}

impl StakePool {
    pub const LEN: usize = std::mem::size_of::<StakePool>();

    pub fn total_weighted_stake_u128(&self) -> primitive::u128 {
        self.total_weighted_stake.as_u128()
    }

    pub fn escape_hatch_enabled(&self) -> bool {
        (self.flags & 0b0000_0001) != 0
    }

    pub fn deposits_disabled(&self) -> bool {
        (self.flags & 0b0000_0100) != 0
    }

    pub fn deposits_ignores_lp(&self) -> bool {
        (self.flags & 0b0000_1000) != 0
    }

    pub fn withdraw_ignores_lp(&self) -> bool {
        (self.flags & 0b0001_0000) != 0
    }

    pub fn get_claimed_amounts_of_reward_pools(&self) -> [u128; MAX_REWARD_POOLS] {
        let mut ret = [u128::default(); MAX_REWARD_POOLS];
        for (index, reward_pool) in self.reward_pools.iter().enumerate() {
            ret[index] = reward_pool.rewards_per_effective_stake;
        }
        ret
    }

    pub fn recalculate_rewards_per_effective_stake<'info>(
        &mut self,
        remaining_accounts: &'info [AccountInfo<'info>],
        reward_vault_account_offset: usize,
    ) -> Result<()> {
        let total_weighted_stake = self.total_weighted_stake_u128();
        if total_weighted_stake == 0 {
            return Ok(());
        }

        let mut remaining_accounts_index: usize = 0;
        for reward_pool in &mut self.reward_pools {
            if reward_pool.is_empty() {
                continue;
            }

            if remaining_accounts_index >= remaining_accounts.len() {
                msg!(
                    "Missing at least one reward vault account. Failed at index {:?}",
                    remaining_accounts_index
                );
                return err!(ErrorCode::InvalidRewardPoolVaultIndex);
            }
            let account_info = &remaining_accounts[remaining_accounts_index];

            if reward_pool.reward_vault != account_info.key() {
                msg!(
                    "expected pool: {:?} but got {:?}",
                    reward_pool.reward_vault,
                    account_info.key()
                );
                return err!(ErrorCode::InvalidRewardPoolVault);
            }

            let token_account: Account<'info, TokenAccount> =
                Account::try_from(&account_info).map_err(|_| ErrorCode::InvalidRewardPoolVault)?;
            remaining_accounts_index += reward_vault_account_offset;

            if reward_pool.last_amount == token_account.amount {
                continue;
            }

            let balance_diff = primitive::u128::from(
                token_account
                    .amount
                    .checked_sub(reward_pool.last_amount)
                    .unwrap(),
            );

            let scaled_balance_diff = balance_diff
                .checked_mul(primitive::u128::from(SCALE_FACTOR_BASE_SQUARED))
                .unwrap();

            let additional_rewards_per_effective_stake = scaled_balance_diff
                .checked_div(total_weighted_stake)
                .unwrap();

            reward_pool.last_amount = token_account.amount;
            let rewards_updated = reward_pool
                .rewards_per_effective_stake_u128()
                .checked_add(additional_rewards_per_effective_stake)
                .unwrap();

            reward_pool.rewards_per_effective_stake = u128(rewards_updated.to_le_bytes());
        }
        Ok(())
    }

    pub fn get_stake_weight(&self, duration: u64) -> u64 {
        if duration < self.min_duration {
            panic!("Unreachable: the lockup is less than the minimum allowed")
        }

        let duration_span = self.max_duration.checked_sub(self.min_duration).unwrap();
        if duration_span == 0 {
            return self.base_weight;
        }

        let duration_exceeding_min = u64::min(
            duration.checked_sub(self.min_duration).unwrap(),
            duration_span,
        );

        let normalized_weight = U192::from(duration_exceeding_min)
            .checked_mul(U192::from(SCALE_FACTOR_BASE))
            .unwrap()
            .checked_div(U192::from(duration_span))
            .unwrap();
        let weight_diff = U192::from(self.max_weight)
            .checked_sub(U192::from(self.base_weight))
            .unwrap();
        let calculated_weight = U192::from(self.base_weight)
            .checked_add(
                normalized_weight
                    .checked_mul(weight_diff)
                    .unwrap()
                    .checked_div(U192::from(SCALE_FACTOR_BASE))
                    .unwrap(),
            )
            .unwrap();

        u64::max(calculated_weight.as_u64(), self.base_weight)
    }
}

#[account]
pub struct StakeDepositReceipt {
    pub owner: Pubkey,
    pub payer: Pubkey,
    pub stake_pool: Pubkey,
    pub lockup_duration: u64,
    pub deposit_timestamp: i64,
    pub deposit_amount: u64,
    pub effective_stake: u128,
    pub claimed_amounts: [u128; MAX_REWARD_POOLS],
}

impl StakeDepositReceipt {
    pub const LEN: usize = std::mem::size_of::<StakeDepositReceipt>();

    pub fn effective_stake_u128(&self) -> primitive::u128 {
        self.effective_stake.as_u128()
    }

    pub fn claimed_amounts_u128(&self) -> [primitive::u128; MAX_REWARD_POOLS] {
        let mut claimed: [primitive::u128; MAX_REWARD_POOLS] = Default::default();
        for (index, value) in self.claimed_amounts.iter().enumerate() {
            claimed[index] = value.as_u128();
        }
        claimed
    }

    pub fn get_effective_stake_amount(weight: u64, amount: u64) -> primitive::u128 {
        primitive::u128::from(amount)
            .checked_mul(primitive::u128::from(weight))
            .unwrap()
    }

    pub fn get_token_amount_from_stake(effective_stake: primitive::u128, max_weight: u64) -> u64 {
        let digit_shift = get_digit_shift_by_max_scalar(max_weight);
        effective_stake
            .checked_div(primitive::u128::from(SCALE_FACTOR_BASE))
            .unwrap()
            .checked_div(10u128.pow(digit_shift.into()))
            .unwrap()
            .try_into()
            .unwrap()
    }

    pub fn validate_unlocked(&self) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp;
        if current_timestamp
            < self
                .deposit_timestamp
                .checked_add(self.lockup_duration.try_into().unwrap())
                .unwrap()
        {
            return Err(ErrorCode::StakeStillLocked.into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_stakepool(
        base_weight: u64,
        max_weight: u64,
        min_duration: u64,
        max_duration: u64,
    ) -> StakePool {
        let mut pool = StakePool::zeroed();
        pool.base_weight = base_weight;
        pool.max_weight = max_weight;
        pool.min_duration = min_duration;
        pool.max_duration = max_duration;
        pool
    }

    fn generic_stakepool() -> StakePool {
        let base_weight = 1 * SCALE_FACTOR_BASE;
        let max_weight = 2 * SCALE_FACTOR_BASE;
        let min_duration = 100;
        let max_duration = 200;

        mock_stakepool(base_weight, max_weight, min_duration, max_duration)
    }

    #[test]
    #[should_panic(expected = "Unreachable: the lockup is less than the minimum allowed")]
    fn get_stake_weight_duration_less_than_min() {
        let stake_pool = generic_stakepool();
        let min_duration = stake_pool.min_duration;
        stake_pool.get_stake_weight(min_duration - 1);
    }

    #[test]
    fn get_stake_weight_duration_equal_min() {
        let stake_pool = generic_stakepool();
        let base_weight = stake_pool.base_weight;
        let min_duration = stake_pool.min_duration;
        assert_eq!(stake_pool.get_stake_weight(min_duration), base_weight);
    }

    #[test]
    fn get_stake_weight_duration_midpoint() {
        let stake_pool = generic_stakepool();
        let base_weight = stake_pool.base_weight;
        let max_weight = stake_pool.max_weight;
        let min_duration = stake_pool.min_duration;
        let max_duration = stake_pool.max_duration;
        let mid_duration = (min_duration + max_duration) / 2;
        assert_eq!(
            stake_pool.get_stake_weight(mid_duration),
            (base_weight + max_weight) / 2
        );
    }

    #[test]
    fn get_stake_weight_duration_equal_max() {
        let stake_pool = generic_stakepool();
        let max_weight = stake_pool.max_weight;
        let max_duration = stake_pool.max_duration;
        assert_eq!(stake_pool.get_stake_weight(max_duration), max_weight);
    }

    #[test]
    fn get_stake_weight_duration_greater_than_max() {
        let stake_pool = generic_stakepool();
        let max_weight = stake_pool.max_weight;
        let max_duration = stake_pool.max_duration;
        assert_eq!(stake_pool.get_stake_weight(max_duration + 1), max_weight);
    }

    #[test]
    fn get_stake_weight_min_duration_equals_max() {
        let mut stake_pool = generic_stakepool();
        stake_pool.max_duration = stake_pool.min_duration;
        let base_weight = stake_pool.base_weight;
        let max_duration = stake_pool.max_duration;
        assert_eq!(stake_pool.get_stake_weight(max_duration + 1), base_weight);
    }
}
