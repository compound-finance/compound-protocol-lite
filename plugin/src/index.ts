import { extendConfig, extendEnvironment, task, types } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import { World } from "./scenario/World";
import path from "path";
// depend on hardhat-ethers
import "@nomiclabs/hardhat-ethers";

import "./type-extensions";
import { evaluate_repl, setup_repl } from "./scenario/Repl";
import { ReplEvaluator } from "./evaluator";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const userPath = userConfig.paths?.networks;

    let networks: string;
    if (userPath === undefined) {
      networks = path.join(config.paths.root, "networks");
    } else {
      if (path.isAbsolute(userPath)) {
        networks = userPath;
      } else {
        networks = path.normalize(path.join(config.paths.root, userPath));
      }
    }
    config.paths.networks = networks;
  }
);

extendEnvironment(async (hre) => {
  // create the world
  hre.world = await setup_repl(hre);
  hre.repl = new ReplEvaluator(hre);
});

const cmd = task("exec", "send message to world");
cmd.addVariadicPositionalParam("cmd", "string to evaluate", ["Print", "test"]);
cmd.setAction(async (args, hre) => {
  hre.world = await setup_repl(hre);
  hre.repl = new ReplEvaluator(hre);
  hre.repl.line(args.cmd.join(" "));
});
