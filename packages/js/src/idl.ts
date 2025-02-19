type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
};

export const _AlrisStakingIDL = {
  "version": "0.1.0",
  "name": "alris_staking",
  "instructions": [
    {
      "name": "initializeStakePool",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u8"
        },
        {
          "name": "maxWeight",
          "type": "u64"
        },
        {
          "name": "minDuration",
          "type": "u64"
        },
        {
          "name": "maxDuration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferAuthority",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "newAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "dangerouslyMintLp",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Payer of rent"
          ]
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Authority of the StakePool"
          ]
        },
        {
          "name": "stakeMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "StakePool of the `stake_mint` to be minted"
          ]
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addRewardPool",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "rewardMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setFlags",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "flags",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "from",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeDepositReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u32"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lockupDuration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimAll",
      "accounts": [
        {
          "name": "claimBase",
          "accounts": [
            {
              "name": "owner",
              "isMut": true,
              "isSigner": true
            },
            {
              "name": "stakePool",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "stakeDepositReceipt",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "tokenProgram",
              "isMut": false,
              "isSigner": false
            }
          ]
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "claimBase",
          "accounts": [
            {
              "name": "owner",
              "isMut": true,
              "isSigner": true
            },
            {
              "name": "stakePool",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "stakeDepositReceipt",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "tokenProgram",
              "isMut": false,
              "isSigner": false
            }
          ]
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "from",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updateTokenMeta",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakeMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "StakePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalWeightedStake",
            "type": "u128"
          },
          {
            "name": "vault",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "stakeMint",
            "type": "publicKey"
          },
          {
            "name": "rewardPools",
            "type": {
              "array": [
                {
                  "defined": "RewardPool"
                },
                10
              ]
            }
          },
          {
            "name": "baseWeight",
            "type": "u64"
          },
          {
            "name": "maxWeight",
            "type": "u64"
          },
          {
            "name": "minDuration",
            "type": "u64"
          },
          {
            "name": "maxDuration",
            "type": "u64"
          },
          {
            "name": "nonce",
            "type": "u8"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "flags",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "reserved0",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "StakeDepositReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "payer",
            "type": "publicKey"
          },
          {
            "name": "stakePool",
            "type": "publicKey"
          },
          {
            "name": "lockupDuration",
            "type": "u64"
          },
          {
            "name": "depositTimestamp",
            "type": "i64"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "effectiveStake",
            "type": "u128"
          },
          {
            "name": "claimedAmounts",
            "type": {
              "array": [
                "u128",
                10
              ]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "RewardPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardVault",
            "type": "publicKey"
          },
          {
            "name": "rewardsPerEffectiveStake",
            "type": "u128"
          },
          {
            "name": "lastAmount",
            "type": "u64"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAuthority",
      "msg": "Invalid StakePool authority"
    },
    {
      "code": 6001,
      "name": "RewardPoolIndexOccupied",
      "msg": "RewardPool index is already occupied"
    },
    {
      "code": 6002,
      "name": "InvalidStakePoolVault",
      "msg": "StakePool vault is invalid"
    },
    {
      "code": 6003,
      "name": "InvalidRewardPoolVault",
      "msg": "RewardPool vault is invalid"
    },
    {
      "code": 6004,
      "name": "InvalidRewardPoolVaultIndex",
      "msg": "Invalid RewardPool vault remaining account index"
    },
    {
      "code": 6005,
      "name": "InvalidOwner",
      "msg": "Invalid StakeDepositReceiptOwner"
    },
    {
      "code": 6006,
      "name": "InvalidStakePool",
      "msg": "Invalid StakePool"
    },
    {
      "code": 6007,
      "name": "PrecisionMath",
      "msg": "Math precision error"
    },
    {
      "code": 6008,
      "name": "InvalidStakeMint",
      "msg": "Invalid lp mint"
    },
    {
      "code": 6009,
      "name": "StakeStillLocked",
      "msg": "Stake is still locked"
    },
    {
      "code": 6010,
      "name": "InvalidStakePoolDuration",
      "msg": "Max duration must be great than min"
    },
    {
      "code": 6011,
      "name": "InvalidStakePoolWeight",
      "msg": "Max weight must be great than min"
    },
    {
      "code": 6012,
      "name": "DurationTooShort",
      "msg": "Duration too short"
    },
    {
      "code": 6013,
      "name": "DepositsDisabled",
      "msg": "Deposits disabled by administrator"
    }
  ]
} as const;

export const AlrisStakingIDL = _AlrisStakingIDL as Mutable<
  typeof _AlrisStakingIDL
>;

export type AlrisStaking = typeof AlrisStakingIDL;
