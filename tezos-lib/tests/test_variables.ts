import { finp2p_account } from './test_lib';

export const utf8 = new TextEncoder()

export var accounts : finp2p_account [] = []

export var asset_id1 = "ORG:102:asset-id1-" + (new Date()).toISOString()
export var asset_id2 = "ORG:102:asset-id2-" + (new Date()).toISOString()
export var asset_id3_utf8 = "ORG:102:asset-طزوس-" + (new Date()).toISOString()
export var asset_id4 = "ORG:102:asset-id4-" + (new Date()).toISOString()
export var ext_asset_id = "ORG:102:external-asset-id-" + (new Date()).toISOString()

export var token_id1 =  Math.floor((new Date()).getTime() / 1000)
