import { FinP2PTezos, Net } from './test_lib'

process.on('SIGINT', async function() {
  await Net.stop_network();
});

const stop = Net.stop_network;

async function start () {
  // Start a sandbox network
  await Net.start_network();

  // Deploy the smart contracts (this is not necessary if the smart contract are
  // already deplopyed on the network we want to use)
  await FinP2PTezos.init({
    operationTTL : {
      ttl : BigInt(15 * Net.block_time), // 15 blocks
      allowed_in_the_future : BigInt(2 * Net.block_time) // 2 block
    },
    fa2Metadata : { name : "FinP2P FA2 assets",
                    description : "FinP2P assets for ORG" }
  })
}

(async () => {
  switch(process.argv[2]) {
    case 'start':
      await start();
      console.log(`Network started, call "${process.argv[1]} stop" to stop sandbox network.`);
      return;
    case 'stop':
      await stop();
      return;
    default:
      console.error(`Usage: ${process.argv[1]} [ start | stop ]`);
      process.exit(1);
  }
})();
