import 'mocha'
import { Net } from './test_lib'

import * as TestInit from './test_init'
import * as TestFinP2PProxy from './test_finp2p_proxy'
import * as TestFA2 from './test_fa2'
import * as TestHold from './test_hold'
import * as TestEscrow from './test_escrow'

describe('FinP2P Contracts',  () => {

  // Run the whole test suite

  TestInit.run();
  TestFinP2PProxy.run();
  TestFA2.run();
  TestHold.run();
  TestEscrow.run();

})
  .beforeAll(Net.start_network)
  .afterAll(Net.stop_network)
