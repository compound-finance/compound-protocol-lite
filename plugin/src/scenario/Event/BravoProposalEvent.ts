import { Event } from "../Event";
import { addAction, describeUser, World } from "../World";
import { GovernorBravo } from "../Contract/GovernorBravo";
import { invoke } from "../Invokation";
import { getEventV } from "../CoreValue";
import { EventV } from "../Value";
import { Arg, Command, processCommandEvent } from "../Command";
import { getProposalId } from "../Value/BravoProposalValue";

function getSupport(support: Event): number {
  if (typeof support === "string") {
    if (support === "For" || support === "Against" || support === "Abstain") {
      if (support === "Against") return 0;
      else if (support === "For") return 1;
      else if (support === "Abstain") return 2;
    }
  }
  throw new Error(
    `Unknown support flag \`${support}\`, expected "For", "Against", or "Abstain"`
  );
}

function getReason(reason: Event): string {
  if (typeof reason[1] === "string") {
    return reason[1];
  } else {
    throw new Error(`Reason is not a string ${reason}`);
  }
}

async function describeProposal(
  world: World,
  governor: GovernorBravo,
  proposalId: number
): Promise<string> {
  return `proposal ${proposalId.toString()}`; // TODO: Cleanup
}

export function proposalCommands(governor: GovernorBravo) {
  return [
    new Command<{ proposalIdent: EventV; support: EventV; reason: EventV }>(
      `
        #### VoteWithReason

        * "GovernorBravo <Governor> Proposal <Number> VoteWithReason <For|Against|Abstain> <Reason>" - Votes for, against, or abstain on a given proposal with reason
        * E.g. "GovernorBravo GovernorBravoScenario Proposal LastProposal VoteWithReason For 'must be done'"
    `,
      "VoteWithReason",
      [
        new Arg("proposalIdent", getEventV),
        new Arg("support", getEventV),
        new Arg("reason", getEventV),
      ],
      async (world, from, { proposalIdent, support, reason }) => {
        const proposalId = await getProposalId(
          world,
          governor,
          proposalIdent.val
        );
        const invokation = await invoke(
          world,
          from,
          governor,
          await governor.populateTransaction.castVoteWithReason(
            proposalId,
            getSupport(support.val),
            getReason(reason.val)
          ),
          "castVoteWithReason"
        );

        return addAction(
          world,
          `Cast ${support.val.toString()} vote from ${describeUser(
            world,
            from
          )} for proposal ${proposalId} with reason ${reason.val.toString()}`,
          invokation
        );
      },
      { namePos: 1 }
    ),

    new Command<{ proposalIdent: EventV; support: EventV }>(
      `
        #### Vote

        * "GovernorBravo <Governor> Proposal <Number> Vote <For|Against|Abstain> <Reason>" - Votes for, against, or abstain on a given proposal
        * E.g. "GovernorBravo GovernorBravoScenario Proposal LastProposal Vote For"
    `,
      "Vote",
      [new Arg("proposalIdent", getEventV), new Arg("support", getEventV)],
      async (world, from, { proposalIdent, support }) => {
        const proposalId = await getProposalId(
          world,
          governor,
          proposalIdent.val
        );
        const invokation = await invoke(
          world,
          from,
          governor,
          await governor.populateTransaction.castVote(
            proposalId,
            getSupport(support.val)
          ),
          "castVote"
        );

        return addAction(
          world,
          `Cast ${support.val.toString()} vote from ${describeUser(
            world,
            from
          )} for proposal ${proposalId}`,
          invokation
        );
      },
      { namePos: 1 }
    ),

    new Command<{ proposalIdent: EventV }>(
      `
        #### Queue
        * "GovernorBravo <Governor> Queue" - Queues given proposal
        * E.g. "GovernorBravo GovernorBravoScenario Proposal LastProposal Queue"
    `,
      "Queue",
      [new Arg("proposalIdent", getEventV)],
      async (world, from, { proposalIdent }) => {
        const proposalId = await getProposalId(
          world,
          governor,
          proposalIdent.val
        );
        const invokation = await invoke(
          world,
          from,
          governor,
          await governor.populateTransaction.queue(proposalId),
          "queue"
        );

        return addAction(
          world,
          `Queue proposal ${await describeProposal(
            world,
            governor,
            proposalId
          )} from ${describeUser(world, from)}`,
          invokation
        );
      },
      { namePos: 1 }
    ),
    new Command<{ proposalIdent: EventV }>(
      `
        #### Execute
        * "GovernorBravo <Governor> Execute" - Executes given proposal
        * E.g. "GovernorBravo GovernorBravoScenario Proposal LastProposal Execute"
    `,
      "Execute",
      [new Arg("proposalIdent", getEventV)],
      async (world, from, { proposalIdent }) => {
        const proposalId = await getProposalId(
          world,
          governor,
          proposalIdent.val
        );
        const invokation = await invoke(
          world,
          from,
          governor,
          await governor.populateTransaction.execute(proposalId),
          "execute"
        );

        return addAction(
          world,
          `Execute proposal ${await describeProposal(
            world,
            governor,
            proposalId
          )} from ${describeUser(world, from)}`,
          invokation
        );
      },
      { namePos: 1 }
    ),
    new Command<{ proposalIdent: EventV }>(
      `
        #### Cancel
        * "Cancel" - cancels given proposal
        * E.g. "GovernorBravo Proposal LastProposal Cancel"
    `,
      "Cancel",
      [new Arg("proposalIdent", getEventV)],
      async (world, from, { proposalIdent }) => {
        const proposalId = await getProposalId(
          world,
          governor,
          proposalIdent.val
        );
        const invokation = await invoke(
          world,
          from,
          governor,
          await governor.populateTransaction.cancel(proposalId),
          "cancel"
        );

        return addAction(
          world,
          `Cancel proposal ${await describeProposal(
            world,
            governor,
            proposalId
          )} from ${describeUser(world, from)}`,
          invokation
        );
      },
      { namePos: 1 }
    ),
  ];
}

export async function processProposalEvent(
  world: World,
  governor: GovernorBravo,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "Proposal",
    proposalCommands(governor),
    world,
    event,
    from
  );
}
