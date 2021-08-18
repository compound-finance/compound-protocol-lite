import { ConsolePrinter, ReplPrinter } from "./Printer";
import {
  addInvariant,
  initWorld,
  loadInvokationOpts,
  loadDryRun,
  loadSettings,
  loadVerbose,
  World,
} from "./World";
import { throwExpect } from "./Assert";
import { Macros } from "./Macro";
import { loadContracts } from "./Networks";
import { accountAliases, loadAccounts } from "./Accounts";
import { runCommand } from "./Runner";
import { parse } from "./Parser";

import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const basePath = process.env.proj_root || process.cwd();
const baseScenarioPath = path.join(basePath, "spec", "scenario");
const baseNetworksPath = path.join(basePath, "networks");

const TOTAL_GAS = 8000000;

async function loop(world, command, macros): Promise<any> {
  try {
    return runCommand(world, command, macros);
  } catch (err) {
    world.printer.printError(err);
  }
}

function loadEnvVars(): object {
  return (process.env["env_vars"] || "").split(",").reduce((acc, keyValue) => {
    if (keyValue.length === 0) {
      return acc;
    } else {
      const [key, value] = keyValue.split("=");

      return {
        ...acc,
        [key]: value,
      };
    }
  }, {});
}

export const setup_repl = async (
  hre: HardhatRuntimeEnvironment
): Promise<World> => {
  // Uck, we need to load core macros :(
  const coreMacros = fs.readFileSync(
    path.join(baseScenarioPath, "CoreMacros"),
    "utf8"
  );
  hre.macros = <Macros>parse(coreMacros, { startRule: "macros" });

  let script = process.env["script"];

  let network = process.env["network"];

  if (!network) {
    network = "mainnet";
  }

  const verbose: boolean = !!process.env["verbose"];
  const hypothetical: boolean = !!process.env["hypothetical"];

  const accounts = await hre.ethers.provider.listAccounts();
  let printer = new ConsolePrinter(verbose);
  let contractInfo: string[];

  let world = await initWorld(
    throwExpect,
    printer,
    hre,
    network,
    accounts,
    basePath,
    TOTAL_GAS
  );
  [world, contractInfo] = await loadContracts(world);
  world = loadInvokationOpts(world);
  world = loadVerbose(world);
  world = loadDryRun(world);
  world = await loadSettings(world);

  printer.printLine(`Network: ${network}`);

  if (hypothetical) {
    const forkJsonPath = path.join(baseNetworksPath, `${network}-fork.json`);
    console.log(`Running on fork ${hre.network}`);
  }

  if (accounts.length > 0) {
    printer.printLine(`Accounts:`);
    accounts.forEach((account, i) => {
      let aliases = world.settings.lookupAliases(account);
      aliases = aliases.concat(accountAliases(i));

      printer.printLine(`\t${account} (${aliases.join(",")})`);
    });
  }

  if (contractInfo.length > 0) {
    world.printer.printLine(`Contracts:`);
    contractInfo.forEach((info) => world.printer.printLine(`\t${info}`));
  }

  printer.printLine(`Available macros: ${Object.keys(hre.macros).toString()}`);
  printer.printLine(``);
  return world;
};

export const evaluate_repl = async (world: World, command: string, macros) => {
  return loop(world, command, macros);
};
