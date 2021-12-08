include Auth_params

type storage = {
  auth_storage : auth_storage;
  auth_authorize : auth_param * auth_storage -> operation list * auth_storage;
}
[@@store]
