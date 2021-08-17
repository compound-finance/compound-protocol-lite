import * as path from "path";
import * as crypto from "crypto";
import { World } from "./World";
import { Invokation } from "./Invokation";
import { readFile } from "./File";
import { AbiItem } from "web3-utils";
import { ethers, EventFilter } from "ethers";

export interface Raw {
  data: string;
  topics: string[];
}

export interface Contract extends ethers.Contract {}

function randomAddress(): string {
  return crypto.randomBytes(20).toString("hex");
}

class ContractStub {
  name: string;
  test: boolean;

  constructor(name: string, test: boolean) {
    this.name = name;
    this.test = test;
  }

  async deploy<T>(
    world: World,
    from: string,
    args: any[]
  ): Promise<Invokation<T>> {
    const opts = { from: from };

    const artifact = await world.hre.artifacts.readArtifact(this.name);
    const signer = await world.hre.ethers.getSigner(from);
    const factory = await world.hre.ethers.getContractFactory(
      this.name,
      signer
    );
    let contract: ethers.Contract;
    let receipt: ethers.providers.TransactionReceipt;
    try {
      if (world.dryRun) {
        let addr = randomAddress();
        console.log(`Dry run: Deploying ${this.name} at fake address ${addr}`);
        contract = new world.hre.ethers.Contract(addr, artifact.abi, signer);
      } else {
        contract = await factory.deploy(...args);
        receipt = await contract.deployTransaction.wait();
      }
      return new Invokation<T>(
        (<unknown>contract) as T,
        receipt,
        null,
        contract as ethers.Contract,
        (factory.getDeployTransaction(args).nonce = null),
        null,
        null
      );
    } catch (err) {
      return new Invokation<T>(
        null,
        null,
        err,
        null,
        (factory.getDeployTransaction(args).nonce = null),
        null,
        null
      );
    }
  }

  async at<T>(world: World, address: string): Promise<T> {
    const artifact = await world.hre.artifacts.readArtifact(this.name);

    return <T>(<unknown>new world.hre.ethers.Contract(address, artifact.abi));
  }
}

export function getContract(name: string): ContractStub {
  return new ContractStub(name, false);
}

export function getTestContract(name: string): ContractStub {
  return new ContractStub(name, true);
}

export function setContractName(name: string, contract: Contract): Contract {
  contract.attach(name);
  return contract;
}

export async function getPastEvents(
  world: World,
  contract: Contract,
  name: string,
  event: string
): Promise<ethers.Event[]> {
  const block = world.getIn(["contractData", "Blocks", name]) as number;
  if (!block) {
    throw new Error(`Cannot get events when missing deploy block for ${name}`);
  }

  return contract.queryFilter(contract.filters[name](), block, "latest");
}

export async function decodeCall(
  world: World,
  contract: Contract,
  input: string
): Promise<World> {
  let functionSignature = input.slice(0, 10);
  let argsEncoded = input.slice(10);

  let abi = contract.interface.getFunction(input);

  if (!abi) {
    throw new Error(
      `Cannot find function matching signature ${functionSignature}`
    );
  }

  let decoded = contract.interface.decodeFunctionData(
    functionSignature,
    "0x" + argsEncoded
  );

  const args = abi.inputs.map((input) => {
    return `${input.name}=${decoded[input.name]}`;
  });
  world.printer.printLine(
    `\n${contract.name}.${abi.name}(\n\t${args.join("\n\t")}\n)`
  );

  return world;
}
