import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { encodedNumber } from "../Encoding";
import { ethers, Transaction } from "ethers";

interface Erc20Methods<T> {
  name(): Promise<T>;
  symbol(): Promise<T>;
  decimals(): Promise<T>;
  totalSupply(): Promise<T>;
  balanceOf(address: string): Promise<T>;
  allowance(owner: string, spender: string): Promise<T>;
  approve(address: string, amount: encodedNumber): Promise<T>;
  allocateTo(address: string, amount: encodedNumber): Promise<T>;
  transfer(address: string, amount: encodedNumber): Promise<T>;
  transferFrom(
    owner: string,
    spender: string,
    amount: encodedNumber
  ): Promise<T>;
  setFail(fail: boolean): Promise<T>;
  pause(): Promise<T>;
  unpause(): Promise<T>;
  setParams(newBasisPoints: encodedNumber, maxFee: encodedNumber): Promise<T>;
}

export type Erc20 = Contract &
  Erc20Methods<ethers.providers.TransactionResponse> & {
    callStatic: Erc20Methods<any>;
    estimateGas: Erc20Methods<ethers.BigNumber>;
  };
