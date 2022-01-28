# Hold and Release for FinP2P Assets

FinP2P assets can represent digital securities but also currencies. This means
that they can be used as a payment mechanism (to settle an asset transfer in
another DLT for instance).

To support this process, additional functionality needs to be added to the asset
tokens smart contracts on the Tezos side. There are two ways to proceed
depending on the guarantees and flexibility that we seek.

## Escrow VS. Hold

### Escrow

FinP2P assets can be moved to an _escrow contract_ which will take care of
holding the tokens. The tokens put in escrow can then be moved to their
destination when the settlement takes place, or they can be returned to the
original owner if it expires or if it is canceled.

With an escrow mechanism, the funds have to be **moved out** from the owners
account to the escrow contract. To an outside observer, it looks like the owner
does not possess the tokens that are in escrow, so in particular, this means
that any (on-chain or off-chain) mechanism which incurs dividends for the
tokens/assets of an owner will not work directly.

The advantage of using an escrow contract is that any (FA2) token can be used as
a settlement currency. This would allow in particular users who own one of the
stable coin on Tezos (such as [USDtz](https://usdtz.com/),
[kUSD](https://kolibri.finance/), [uUSD](https://youves.com/), wrapped USDC
tokens, or [USDC](https://www.circle.com/en/usdc) if it supports Tezos in the
future), to make payment on FinP2P directly.


### Hold and Release

In order for the owners to keep their tokens in their account, one must
implement a hold mechanism on the token natively. This means that tokens never
leave a users account, but instead the FA2 token contract (or an external
coupled one) keeps track of holds that are opened for every user and every
tokens. The FA2 contract then ensures that only funds that are not on hold can
be moved out of an account (in an asset transfer, or asset redeem operation for
instance).

The advantage of this approach, is that the tokens and value stay in possession
of the user when they are put on hold, which allows external mechanisms (_e.g._,
for dividends) to work unchanged. Because all the information about the tokens
are kept in the same place, it is also easier to retrieve what is relevant for
applications (for instance, the number of held tokens for user, _etc._).

The drawback is that only tokens that natively support this hold mechanism can
be used. For the FinP2P application, this means that the organizations will need
to issue the tokens that represent FIAT currency themselves. (But note that
these tokens will be subject to the same constraints as the FinP2P security
tokens, and in particular they will not be exchangeable freely.)

Because the constraint that users keep their held tokens in their account is
important for FinP2P, (and it is more important than to allow users to use
already existing stable coins) we have decided to implement the **Hold**
mechanism described above in the V1.

