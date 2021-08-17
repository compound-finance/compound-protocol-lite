import { Accounts, loadAccounts } from "./Accounts";
import {
  addAction,
  checkExpectations,
  checkInvariants,
  clearInvariants,
  describeUser,
  holdInvariants,
  setEvent,
  World,
} from "./World";

export async function fork(
  world: World,
  url: string,
  block: number,
  accounts: string[]
): Promise<World> {
  await world.hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: url,
          blockNumber: block,
        },
      },
    ],
  });
  return world;
}
