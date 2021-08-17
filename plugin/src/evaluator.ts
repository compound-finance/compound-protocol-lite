import { HardhatRuntimeEnvironment } from "hardhat/types";
import { evaluate_repl } from "./scenario/Repl";

export class ReplEvaluator {
  hre: HardhatRuntimeEnvironment;
  constructor(hre: HardhatRuntimeEnvironment) {
    this.hre = hre;
  }

  line = async (x: string) => {
    for (const command of x.split("\n")) {
      try {
        evaluate_repl(this.hre.world, command, this.hre);
      } catch (e) {
        console.log(e);
        return;
      }
    }
  };

  lines = async (x: Array<string>) => {
    for (const command of x) {
      try {
        evaluate_repl(this.hre.world, command, this.hre);
      } catch (e) {
        console.log(e);
        return;
      }
    }
  };
}
