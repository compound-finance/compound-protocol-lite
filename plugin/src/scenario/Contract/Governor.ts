import { Contract } from "../Contract";
import { Callable } from "../Invokation";
import { encodedNumber } from "../Encoding";
import { ethers } from "ethers";

export interface Proposal {
  id: number;
  proposer: string;
  eta: number;
  targets: string[];
  values: number[];
  signatures: string[];
  calldatas: string[];
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
}

export const proposalStateEnums = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded",
  5: "Queued",
  6: "Expired",
  7: "Executed",
};

export interface GovernorMethods<T> {
  guardian(): Promise<T>;
  propose(
    targets: string[],
    values: encodedNumber[],
    signatures: string[],
    calldatas: string[],
    description: string
  ): Promise<T>;
  proposals(proposalId: number): Promise<Proposal>;
  proposalCount(): Promise<T>;
  latestProposalIds(proposer: string): Promise<T>;
  getReceipt(
    proposalId: number,
    voter: string
  ): Promise<{ hasVoted: boolean; support: boolean; votes: number }>;
  castVote(proposalId: number, support: boolean): Promise<T>;
  queue(proposalId: encodedNumber): Promise<T>;
  execute(proposalId: encodedNumber): Promise<T>;
  cancel(proposalId: encodedNumber): Promise<T>;
  setBlockNumber(blockNumber: encodedNumber): Promise<T>;
  setBlockTimestamp(blockTimestamp: encodedNumber): Promise<T>;
  state(proposalId: encodedNumber): Promise<T>;
  __queueSetTimelockPendingAdmin(
    newPendingAdmin: string,
    eta: encodedNumber
  ): Promise<T>;
  __executeSetTimelockPendingAdmin(
    newPendingAdmin: string,
    eta: encodedNumber
  ): Promise<T>;
  __acceptAdmin(): Promise<T>;
  __abdicate(): Promise<T>;
}

export type Governor = Contract &
  GovernorMethods<any> &
  GovernorMethods<ethers.providers.TransactionResponse> & {
    callStatic: GovernorMethods<any>;
    estimateGas: GovernorMethods<ethers.BigNumber>;
  };
