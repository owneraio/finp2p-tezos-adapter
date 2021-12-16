# Cost Analysis of Smart Contract Calls

## Implementation choices for byte conversions

Transforming timestamps to bytes encoding int64 (big endian) requires to
associate to each integer in the range [0, 255] the corresponding
byte. Similarly, transforming amounts in bytes encoding _the string of
hexadecimal digits representing the amount in int64 big endian_ requires to
associate each integer in the range [0, 255] to a corresponding string with
the hexadecimal for the corresponding byte.

There are several ways and choice to implement this:

1. Have a function (i.e. a lambda expression) that performs a dichotomy in the
   range [0; 255] and returns the corresponding byte (or string). This code can
   be generated (see
   [gen_finp2p_conv.ml](../contracts/scripts/gen_finp2p_conv.ml)).   
2. Have a map that associate each integer in [0, 255] to a byte or a string.

For each of these choices, we need to decide if:

1. we store both byte and string representation in the same place (_e.g._, as
   pair) or if we have two maps (or two functions) for each use.
2. we inline the maps and functions or not.
3. we store the map (this is not interesting for functions) in the storage or as
   a constant value in the code.
   

In this experiment, we deploy a smart contract that **only computes** the
payload to be signed (and for which we will check signatures), _i.e._ `[AHG,
SHG]`, for a `transfer_tokens` operation (the others are similar in this
respect) and compare the cost in gas, fees and initial deployment cost.

Implementation | Deployment | Gas | Fees
---|---:|---:|---:
2 functions    | 5.66 ꜩ | 2236 | 0.000824 ꜩ 
1 function     | 4.04 ꜩ | 6351 | 0.001236 ꜩ 
1 map storage  | 2.00 ꜩ | **1769** | **0.000777 ꜩ**
1 ligo map code| 2.83 ꜩ | 2380 | 0.000838 ꜩ 
1 michelson map code wrapped | 1.95 ꜩ | 3384 | 0.000935 ꜩ 
1 michelson map code | **1.93 ꜩ** | 2200 | 0.00082 ꜩ 
2 michelson maps code | 2.11 ꜩ | 1996 | 0.0008 ꜩ 

The deployment cost does not really matter (unless it is exorbitant) because
this contract will only be deployed once (or updated a few times).

The cheapest option in terms of operating the contract, it to have a map
containing the associations in the **storage** of the smart contract. However,
this solution is not completely satisfactory because the initial value of the
storage of the smart contract is decided at deployment time and is not part of
the contract code, _per se_. This makes auditing a bit tedious and can be
dangerous if someone originates the contracts with the wrong value in the
storage.

Instead we propose to use the next cheapest option (which is only 0.000023 ꜩ, or
$0.000092 more expensive, _i.e._ a difference of $1 every 10000 transactions),
which both makes the code simpler and brings better safety guarantee. In this
solution the code declares two constants that map integers, to bytes
(resp. strings).

We also declare the map using _inlined Michelson_ code in the source, instead of
relying on the builtin `Map.litteral` of Ligo which is compiled sub-optimally
to Michelson.
