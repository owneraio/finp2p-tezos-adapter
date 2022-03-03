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
// Note that this account must also be an admin of the `finp2p_proxy` contract
export let masterAdmin = {
  pkh : 'tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz',
  pk : 'edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq',
  sk : 'edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS',
};

//TODO: move this to configuration
// Note that these accounts must be admin of the `finp2p_proxy` contract
export let accounts = [
  masterAdmin,
  {
    pkh: 'tz1aABc8BL4EoFPKb9JqCQicP5He8NRMex73',
    pk: 'edpku9b4PwaVMNFciuwcgcUHPVBH9eJvfBuc4kPJKkVyHBMcRvHVSF',
    sk: 'edskS4xXGNV15B2RGmtYNsiKyaumQFpzwhjMcU1XEHGv4ShufriYzLyWBNT8KrptpbPUc6mH37NGpRMTvSY5cB6MDCzUpdewzF',
  },
  {
    pkh: 'tz1g3TUddkW4GRBSJZpCLAPdYZEpNZBtLigg',
    pk: 'edpkvLPbg9NtxYWUfTrin2v1A6Z9ojpDR9TmBCkbBv78wjNCzc1Xhz',
    sk: 'edskRqq1AxQobYsn1SReNdeNKciNCP8WBnk2Bnh7iCyfZ8LTDMdYJ8A12iA2B987vYAAE4c3zyJPyQENvRCmx22JxLKwAnapmt',
  },
  {
    pkh: 'tz1NFdirwUMhz7Y2gShTb4eiBRPXnVaTzo4Y',
    pk: 'edpkuNMo1SXKEJS3dbSHp2qBfGCZCj1x7fTuLviYTftc1hYsCE9QZc',
    sk: 'edskS2ed1K6RqbVo5ncYTQnYLy8e7nKdDa7TYsRqe47a4Y2iuV1haT9kBv85wEKbrTCeDJALvrgVu6stoYtqUBUKc2pHt3xDn3',
  },
  {
    pkh: 'tz1Vxhe7gQZzHpc99BHnnN3j3xWTsbBffBcB',
    pk: 'edpkvNmY6S22xjcj3VsZELuvDZzQA2zuG1mEw6eBAStqNqBPuw3kjD',
    sk: 'edskS743SdYeCtwPFCxmKaCBr6TiTyHeoJwMpxMyX3s5RNjMwCC86SHT4HZoLibFmNM7gMXZLYXehcLAqhHPuk6yY3EzYx7eob',
  },
  {
    pkh: 'tz1bjg513GEJbSaJcxyuZFKVQnvUJ7mgSUE4',
    pk: 'edpku8zUv1L27Qg2iiiSj6zA4wiN4b7BeEbM61KJRq1s2xRMSG8Qiz',
    sk: 'edskRh7p7y4MVZYnvhm35Df2SFXKBQSKb3293sAZhzsUHUTQupqCNmcPLoCRuMNgC7YWDWexqpXZrFqxQju9rYbCFapaD5ZJzW',
  },
  {
    pkh: 'tz1eLnaPe4mVrz1QCekxeSiqfvKyG79TjnyY',
    pk: 'edpkuKV43hEeZu26e4NA8zTe9E89zgNbwHPcMXj34CjHrAgjEVWrzv',
    sk: 'edskS1zSUb6APGVpNC6QqUN1JF81SpKNHTiu7am3RezrHdLfnmjXTLSMw4QQtpsjhR3tpz1nota3VA9F4Bqpk5LJY9vpuuVzKE',
  },
  {
    pkh: 'tz1L9rSkbdceaRTpTbeKfMVjWpqZpZdgzJod',
    pk: 'edpkuDrvNCkGK5N3Cu48wAe5eFjPxxZRRmMTQs3xKMkwHtZK2SvciP',
    sk: 'edskRnQ7phCpg2kxRLGQoNBbFs6odBsF6se6ARg7d56q1B8ELV1AHN1eFeRA1JXQgT8Bh2sTrPApMbFwyRcY5jUzkJgPvZTH7C',
  },
  {
    pkh: 'tz1U5TpkugACh4bWoRZi4qn8JfPmKcaM18vw',
    pk: 'edpkvHjoNstUHjAcjAqd3fuamDrFWdBFnMWGttc69r1TED5oMdHsv2',
    sk: 'edskRhiBGV7qo3dRLYxXj5cFz6dxswrfBzaoR83uwxwEdEn84EfzjWPLVT5fSfBu5tPEPJtNSv3TAf9kSha8F1nCJhjcpo1HHw',
  },
  {
    pkh: 'tz1YnrQkv27JafhczciqEbTxvrnPqnqysg8h',
    pk: 'edpkufFGXUEMZ66TvZg9nYJD36vXphH2fDM5XZ3L8q7zurCjA7thf7',
    sk: 'edskRjN4k2UgBuXWvKANiazRyRh7NzZooN3JzWh7h58bhm9XGnSWVuWDLrG2wJqbmyJrZBpnvmAVptMhczp7CZYBS1FzB72ktf',
  },
  {
    pkh: 'tz1bNSBmXHPWX6ubq4rYtBdS8hWK5QqvfWw3',
    pk: 'edpktwyyzWDFojUzWnAw9hDwrp8N6xx2gpxtrnZ1EMLPae5ZuZtmPT',
    sk: 'edskS1cVYgmnsbHkFYbFSCKRkEPwDp9beqC3BjU3Fd9fwrhg314osrzGZ1DUhy7gbjztnr2fnDXuv9yMffr9X5w376AnRm8i1K',
  },
  {
    pkh: 'tz1W7JDPDtMw9zAMXvYyY9vkCeAq7jL5bCjN',
    pk: 'edpkupR6hXsEKNsdkq4KpUyYxKX2jv93c6NkZpKJtAajv1FsxYgYzE',
    sk: 'edskRkcAK59o3Z9PTj5zuVnKqzD23ZiCQ3y6s67TECeyG41AL56bB5hqUkZ74NjpQUXFhZcCizmjxtZeHmRt2xpyiCmjP7FQvv',
  },
  {
    pkh: 'tz1SwLUpJFe8uT2zkp7sostPR32TNYUcMbNQ',
    pk: 'edpkuMniMhouJVGDEiybLrnEE8X3rHHuR4nuh2uS2xfcofkjbzf32u',
    sk: 'edskS9fHRtckVJWgZjghp9CG3YymPzpoVW6W3PbYE5FR1mboD1CcqPLVAqjjpS7Ja7EbUamLTJ4yVNPcYp7HRfwHvqeG1PJMCu',
  },
  {
    pkh: 'tz1U9rT4zwiwtjsDXkVJAgprWQVavj6KGxAg',
    pk: 'edpkvZTUQrpREegSXi4uXLFYT2WeKbD3VnuMSHVfztfRaWAo79tsG7',
    sk: 'edskS6N1vZWigfL6UtuxZ3gVppph6qeKY2PRRA4TYAkUYgJfSaBshW67YzEo6WW51f8Hq4BxCjStEdrTxS26GGWj1cy8KTG9jZ',
  },
  {
    pkh: 'tz1Pc93aiuQnHP27aZwaeqjJWW36jDtgcSb6',
    pk: 'edpkuXSNeUobfb3yfkFxP4hKa1am6h7Em8XJkGjvSKAUP8Mk7MkVDP',
    sk: 'edskRfxQX3zv8rkD64YmpSG4h2voDFKnAwdkQKYYfNivdp7hXmzsGQKsFLwA4LiNpL7Q7ehDVRi17HBfq7qWr1dwMPfT2aRoSC',
  },
  {
    pkh: 'tz1SzUSs5tnmxJzdNmK6entzuuZkwRZi8A9w',
    pk: 'edpkuAgaPmKgrUjaUEhMuHNcBxg5kbyziu3mYxy3yxGRFLP4SRWrUb',
    sk: 'edskRooftAZPJyWGjCGncQovGfEB5YD15BN9qpuy5QrWiiZbNxAwXQcKUe82fXbyyX5WUwtPoXkQNVtj9zoCQJcQur7jgZXgSZ',
  },
  {
    pkh: 'tz1LN8mjjJ3unFfcTvoa7vt2dcUJMcngU243',
    pk: 'edpktgm2z9E1AkGQ3ZD55YDjGD1mgYa6uas7patD1giN9pFzbizziE',
    sk: 'edskRxjv78L7PedwKCbHqrzGfNSNNg5R3WN37W4UoTsgzKexG4thUaP9cfJ9yAvvY6h9Jhqc9hoTfYxzvcSpyy4M7qFyV5j4U2',
  },
  {
    pkh: 'tz1UC6KJ1rjtD9Nz6F33kMTc7L4SHD6mjqNF',
    pk: 'edpkvVYb77nGC9QMKEz715B33XrXCmXiPnX1Foud2BENew6tXgVZHZ',
    sk: 'edskRiQyMWogbg66bkG3bwo9ipWkaCHCzUKPTqRvim7yfRxK7NKYbgcUZwAaq8aehiZKBMmR39j5w5UmEgeRigkvSM2EuTAPzk',
  },
  {
    pkh: 'tz1iDUV5tLeueK74HW8BRe3ZSbVQuVPibB22',
    pk: 'edpkv5n2XJF281TvEpvrym63HvYyA8CZpJZyWfijetLxqCFDxyiVu8',
    sk: 'edskRyhFB2Vj6jrxm8ymRkpXRpXWdEpB3tUxnk6QgLVwS7MeLTKAg3bh5hzMLb8RWsHo7c9M47Kbw5CgivyW3fdYmgZRqDWrnj',
  },
  {
    pkh: 'tz1QkvDcfTi8zjeMey8ZFtRSyt5khCVy6bX8',
    pk: 'edpkuSAREWH35tw4WQpbufekjpUrqwcR6X64FvuW2N7B3nmtoYAYT9',
    sk: 'edskRfMs57egdna6pQzF1MmQvQhHt46wU2LwyKtTpEamG2pwLZJeVbouLJBdHEStqdxMzqQrDQD3xJYjq2djtENX6NhEPn93gJ',
  },
  {
    pkh: 'tz1aynQ26Mh7VP2HqzPAGhRueBcEdMXUHGs8',
    pk: 'edpkvR2jc6UW4auM1Eg4Mv7oq9dUAF64zerXownDUHVLT1CSsbb2B9',
    sk: 'edskSB5TvV3h9iBiCnLExJ94RGJKswcGNcotPRuqaPpLKuWwftbpFNGkSyM5skHY1HuLVczjU5AuWWHmm7jvC6o48ayZVYUrwM',
  },
  {
    pkh: 'tz1TuhzLJnKVhtxZiYDRCktpqDYkmoqX7RUn',
    pk: 'edpkuvDfC2dA6uBTd21hK7X85LoAqpWtRuEtfQoMQhWTqVVqaMuR2f',
    sk: 'edskS5ZhmAWy1dN8vtEFw6bY53683WL4qbcuzwEsatwKQhFTGMu13jQkjMrjCcxexZxMQ58LFv3UCirxnvE6qrkL4trS8cuS33',
  },
  {
    pkh: 'tz1hTD2xg1bg77vmSib6hhdvpYHEic33cfWz',
    pk: 'edpkti72zYiJKTQ1WRiueWBDb21pQ766wdxtqPiNNnnw3oEYCFV7WW',
    sk: 'edskRyfzwoPp6NJf3WZjRgAK9XvHPWxKCUNWodttXNG4EXamNjYEqcqqVbcMaLH7g6ff4T7RGQD99JQHAiEHkmCYkVv7LkRRcj',
  },
  {
    pkh: 'tz1f4uMgBo5wPuu2Kb3dDUw5hEsgXPk6jxs8',
    pk: 'edpkuxAZeyrBqFnQJKFJPQc9ohVgwMXSTzv7XQgQ5Cd7Tt8MBFicns',
    sk: 'edskRomQB6pdXfJM8NiGBFdafgMWNEnm69FeTgc3iCgzkRD4izPaySQUJcuaS2KXkEhS58oppt6qvPxDzJGb213syEjguYcucP',
  },
  {
    pkh: 'tz1iFixRj7j2CM8HzShSxYzPHk2but47Tvv4',
    pk: 'edpkvTFHTCg43epRVpgMoxb1mk2N6oEDv8mQvuTmpzQWbgJjyaRXZf',
    sk: 'edskReHh457DtYJsKDdRdnxfsf5duH2HMvyLcyPrNWoDrN9J89xT2Es15RJCLgQnvNi6XjK9e2wgP7Aow7tUekNBkvhj6C5q83',
  },
  {
    pkh: 'tz1LcaDrxYuxoM99AALn3GgYBmBuK6keoySn',
    pk: 'edpkvaKf3tR2Hbn2WZkxWcW7EysuVQqvQ1YoKQXfDF9EHjdLpk5baT',
    sk: 'edskRhMSscBZffHJssRZCr6HLfoSdfr3DUzQfjSVqgQizjFLKEFJogRLDxoZ5CAD2YkCEtt2rm6DDnDybRMwKTYiFgyYdAeQ2W',
  },
  {
    pkh: 'tz1VCYH6WHcFb5yrJQeAnVPNAphNYKwAUANK',
    pk: 'edpkux45xtdCAvwBAnWjMqUtSjXGuxs5DmhRcxeMcaRaNeaigPGZ1n',
    sk: 'edskS4nL46VGrPT7LNjv348G5TL3pRum5PAAb8daUHtLXHVjjCacnRKyyT2pKR8T4VUeQ8Zi9ef8rXjgUqhfTya9MD2FztY1xo',
  },
  {
    pkh: 'tz1ieUu4NjHMVpkU3AipBpuaKmBp3aYweKmm',
    pk: 'edpktpE4R5SRXqcHjWs71armKzZ5CSPZjhQxJcbs2gDMVc4Efm7YLh',
    sk: 'edskRvYenyYzvENriNxffLMairJW3aSRoVjWWv3NhoHpcR6V8EnqSDs8cUvfkRcmeYcgEj36SkYXM4NJTs33dxJpK7gDWKfad5',
  },
  {
    pkh: 'tz1a3YpTNMXWyMCCNLUGXyM7mQ37Dt7J7iyV',
    pk: 'edpkvLgirnc4x8Jh4eKTSdayLDAF7J9jJJv5UYz611Z4u7BDJomwwu',
    sk: 'edskRqqCtMmZr5kbVudDGmxXih2c4TJX5taoXjVYpzhRxFi5fXqL7wKLjAVEkCiccCRFZXNKvKp5PsPuFe8ufF5NZjcB86kQoX',
  },
  {
    pkh: 'tz1QfPhpcYbVzZLm62N7xVGWJx57rUycVSuK',
    pk: 'edpkvZphFnqeCfochZmjLVVJ9hzcKMdKYBTsi4tGKetRG2eKQKx8fo',
    sk: 'edskS7UpVh4udsCXtGQMSmMEgPiYNhxvtjdq4ub7dtpBiWxEHG5UMpiae6AEcCVLW4QgrZWE6imjPph9ZCUece5KaUVhT92o9H',
  },
  {
    pkh: 'tz1Z32njBp834T7TR6NbdeycKCTouBcfkQ5d',
    pk: 'edpkuf8RfqTVFUhD6soY5xxqyNdiXAtR9VZrcG3ia3Zk6jxApmAMmc',
    sk: 'edskRw5oDHLU1gmsrvGucURceBwKPFXVzfF43F6817d2XqAb4gP8naoeG22yHZ7fxR1BRSmTh95NijLzyzBWkmgseyQE3SXc8E',
  },
];

// Initialize FinP2P library
//TODO: move this to configuration
export const contracts = {
  finp2pAuthAddress : 'KT19FphHNf55Y5LkEQwXtBw9w2zJsiHNduj2',
  finp2pFA2Address : 'KT1L2TH91yZ5hGquq28vud2N1eipQKRwiUqA',
  finp2pProxyAddress : 'KT1B8ZhxLP6w6B2R5DtUs1KJbp6Gi9qn5Tyw',
};
