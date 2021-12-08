#if !AUTH_TYPES
#define AUTH_TYPES

#include "auth_params.mligo"
type storage =
  {
    storage: auth_storage ;
    authorize: (auth_param * auth_storage) -> (operation list * auth_storage) }

#endif