export const nodeAddr = process.env.NODE_ADDR || 'https://rpc.hangzhounet.teztnets.xyz';
export const explorers = [
  {
    kind : 'TzKT' as 'TzKT',
    url : process.env.TZKT_ADDR || 'https://api.hangzhou2net.tzkt.io',
  },
  {
    kind : 'tzstats' as 'tzstats',
    url : process.env.TZSTATS_ADDR || 'https://api.hangzhou.tzstats.com',
  },
];

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
  finp2p_auth_address : 'KT1QjrVNZrZEGrNfMUNrcQktbDUQnQqSa6xC',
  finp2p_fa2_address : 'KT1EHgvTiafJWkdQXeTENJqFbCUx4EBy8mtk',
  finp2p_proxy_address : 'KT1BN9jjeog53f3QL9w6MvqSTmuYnJDrG5JD',
};
