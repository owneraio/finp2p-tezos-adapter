export const nodeAddr = process.env.NODE_ADDR || 'https://rpc.hangzhounet.teztnets.xyz';

//TODO: move this to configuration
// This is the account that we will use to sign transactions on Tezos Note that
// this account must also be an admin of the `finp2p_proxy` contract
export let account = {
  pkh : 'tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz',
  pk : 'edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq',
  sk : 'edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS',
};

// Initialize FinP2P library
//TODO: move this to configuration
export const contracts = {
  finp2p_auth_address : 'KT1N2ASxaShJETXs5yarM7rozTq4SwWMKTYY',
  finp2p_fa2_address : 'KT19fMJ34XeivLXDfkSm5cSTfuX9TtjPzQEJ',
  finp2p_proxy_address : 'KT1MvSFwHpSguMi8Ra1q8sey7cx2b7EfWSim',
};
