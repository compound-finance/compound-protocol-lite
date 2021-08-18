import {
  ErrorReporter,
  NoErrorReporter,
  ComptrollerErrorReporter,
} from "./ErrorReporter";
import { mustArray } from "./Utils";
import { World } from "./World";
import { encodedNumber } from "./Encoding";
import { ethers, UnsignedTransaction } from "ethers";
import BigNumber from "bignumber.js";
import { Contract } from "hardhat/internal/hardhat-network/stack-traces/model";
import { Fragment, FunctionFragment } from "ethers/lib/utils";
const errorRegex = /^(.*) \((\d+)\)$/;

function getErrorCode(revertMessage: string): [string, number] | null {
  let res = errorRegex.exec(revertMessage);

  if (res) {
    return [res[1], Number(res[2])];
  } else {
    return null;
  }
}

export interface InvokationOpts {
  from?: string;
  gasLimit?: number;
  gasPrice?: number;
}

export class InvokationError extends Error {
  err: Error;
  // function : string
  // arguments : {[]}

  constructor(err: Error) {
    super(err.message);
    this.err = err;
  }

  toString() {
    return `InvokationError<err=${this.err.toString()}>`;
  }
}

export class InvokationRevertFailure extends InvokationError {
  errCode: number;
  error: string | null;
  errMessage: string;

  constructor(
    err: Error,
    errMessage: string,
    errCode: number,
    error: string | null
  ) {
    super(err);

    this.errMessage = errMessage;
    this.errCode = errCode;
    this.error = error;
  }

  toString() {
    return `InvokationRevertError<errMessage=${this.errMessage},errCode=${this.errCode},error=${this.error}>`;
  }
}

interface Argument {
  name: string;
  type: string;
}

interface Method {
  name: string;
  inputs: Argument[];
}

export interface Callable<T> {
  estimateGas: (InvokationOpts?) => Promise<number>;
  call: (InvokationOpts?) => Promise<T>;
}

export interface Sendable<T> extends Callable<T> {
  send: (InvokationOpts) => Promise<ethers.providers.TransactionReceipt>;
}

export class Failure {
  error: string;
  info: string;
  detail: string;

  constructor(error: string, info: string, detail: string) {
    this.error = error;
    this.info = info;
    this.detail = detail;
  }

  toString(): string {
    return `Failure<error=${this.error},info=${this.info},detail=${this.detail}>`;
  }

  equals(other: Failure): boolean {
    return (
      this.error === other.error &&
      this.info === other.info &&
      this.detail === other.detail
    );
  }
}

export class Invokation<T> {
  value: T | null;
  receipt: ethers.providers.TransactionReceipt | null;
  error: Error | null;
  failures: Failure[];
  method: string | null;
  args: { arg: string; val: any }[];
  errorReporter: ErrorReporter;
  contract: ethers.Contract;
  fragment: FunctionFragment;

  constructor(
    value: T | null,
    receipt: ethers.providers.TransactionReceipt | null,
    error: Error | null,
    contract: ethers.Contract,
    txn: UnsignedTransaction,
    name: string,
    errorReporter: ErrorReporter = NoErrorReporter
  ) {
    this.value = value;
    this.receipt = receipt;
    if (contract !== null && name != null) {
      this.fragment = contract.interface.getFunction(name);
    }
    this.contract = contract;
    this.error = error;
    this.errorReporter = errorReporter;

    if (this.contract !== null && this.fragment !== null && txn !== null) {
      const result = contract.interface.decodeFunctionData(
        this.fragment,
        txn.data
      );
      this.args = this.fragment.inputs.map((argument, i) => {
        const argname = this.fragment.inputs[i].name;
        return {
          arg: argname,
          val: result[argname],
        };
      });
    } else {
      this.method = null;
      this.args = [];
    }

    if (receipt !== null && receipt.logs && receipt.logs["Failure"]) {
      const failures = mustArray(receipt.logs["Failure"]);

      this.failures = failures.map((failure) => {
        const {
          error: errorVal,
          info: infoVal,
          detail: detailVal,
        } = failure.returnValues;

        return new Failure(
          errorReporter.getError(errorVal) || `unknown error=${errorVal}`,
          errorReporter.getInfo(infoVal) || `unknown info=${infoVal}`,
          errorReporter.getDetail(errorVal, detailVal)
        );
      });
    } else {
      this.failures = [];
    }
  }

  success(): boolean {
    return this.error === null && this.failures.length === 0;
  }

  invokation(): string {
    if (this.method) {
      let argStr = this.args
        .map(({ arg, val }) => `${arg}=${val.toString()}`)
        .join(",");
      return `"${this.method}(${argStr})"`;
    } else {
      return `unknown method`;
    }
  }

  toString(): string {
    return `Invokation<${this.invokation()}, tx=${
      this.receipt ? this.receipt.transactionHash : ""
    }, value=${this.value ? (<any>this.value).toString() : ""}, error=${
      this.error
    }, failures=${this.failures.toString()}>`;
  }
}

export async function fallback(
  world: World,
  from: string,
  to: string,
  value: encodedNumber
): Promise<Invokation<string>> {
  let trxObj = {
    from: from,
    to: to,
    value: value.toString(),
  };

  return invoke(world, from, null, trxObj, null, NoErrorReporter);
}

export type sendMethod<T> = (...args: any[]) => Promise<T>;
export type transactionMethod = (
  ...args: any[]
) => Promise<ethers.UnsignedTransaction>;
export type gasMethod = (...args: any[]) => Promise<ethers.BigNumber>;
export type callMethod<T> = (...args: any[]) => Promise<T>;

export async function invoke<T>(
  world: World,
  from: string,
  contract: ethers.Contract,
  txn: UnsignedTransaction,
  name: string,
  errorReporter: ErrorReporter = NoErrorReporter
): Promise<Invokation<T>> {
  let value: T | null = null;
  let receipt: ethers.providers.TransactionReceipt | null = null;
  let worldInvokationOpts = world.getInvokationOpts({ from: from });
  let trxInvokationOpts = world.trxInvokationOpts.toJS();

  const fragment = contract.interface.getFunction(name);

  let invokationOpts = {
    ...worldInvokationOpts,
    ...trxInvokationOpts,
  };

  if (world.totalGas) {
    invokationOpts = {
      ...invokationOpts,
      gasLimit: world.totalGas,
      gasPrice: 1000000000,
    };
  } else {
    invokationOpts = {
      ...invokationOpts,
      gasLimit: 2000000000,
      gasPrice: 1000000000,
    };
  }

  const final = { ...txn, ...invokationOpts };
  let error: null | Error = null;
  try {
    await world.hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [from],
    });
    const signer = await world.hre.ethers.getSigner(from);
    try {
      const raw = await signer.call(final);
    } catch (err) {
      error = new InvokationError(err);
    }
    let result: ethers.providers.TransactionResponse | null;
    if (world.dryRun) {
      world.printer.printLine(`Dry run: invoking \`${fragment.name}\``);
      // XXXS
      receipt = <ethers.providers.TransactionReceipt>(<unknown>{
        blockNumber: -1,
        transactionHash: "0x",
        gasUsed: 0,
        events: {},
      });
    } else {
      result = await signer.sendTransaction(final);
      receipt = await result.wait();
      world.gasCounter.value += receipt.gasUsed.toNumber();
    }

    await world.hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [from],
    });

    //  if (world.settings.printTxLogs) {
    const eventLogs = Object.values((receipt && receipt.logs) || {});

    for (const tx of eventLogs) {
      const parsedTxn = contract.interface.parseLog(tx);
      console.log("EMITTED EVENTS:   ", parsedTxn);
    }
    //  }

    return new Invokation<T>(
      value,
      receipt,
      null,
      contract,
      txn,
      name,
      errorReporter
    );
  } catch (err) {
    if (errorReporter) {
      let decoded = getErrorCode(err.message);

      if (decoded) {
        let [errMessage, errCode] = decoded;

        return new Invokation<T>(
          value,
          receipt,
          new InvokationRevertFailure(
            err,
            errMessage,
            errCode,
            errorReporter.getError(errCode)
          ),
          contract,
          txn,
          name,
          errorReporter
        );
      }
    }
    return new Invokation<T>(
      value,
      receipt,
      new InvokationError(err),
      contract,
      txn,
      name,
      errorReporter
    );
  }
}
