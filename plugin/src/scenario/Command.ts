import { Event } from "./Event";
import { World } from "./World";
import { mustArray } from "./Utils";
import { NothingV } from "./Value";

interface ArgOpts<T> {
  default?: T | T[];
  implicit?: boolean;
  variadic?: boolean;
  mapped?: boolean;
  nullable?: boolean;
  rescue?: T;
}

export class Arg<T> {
  name: string;
  type: any;
  getter: (World, Event?) => Promise<T>;
  defaultValue: T | T[] | undefined;
  implicit: boolean;
  variadic: boolean;
  mapped: boolean;
  nullable: boolean;
  rescue: T | undefined;

  constructor(
    name: string,
    getter: (World, Event?) => Promise<T>,
    opts = <ArgOpts<T>>{}
  ) {
    this.name = name;
    this.getter = getter;
    this.defaultValue = opts.default;
    this.implicit = !!opts.implicit;
    this.variadic = !!opts.variadic;
    this.mapped = !!opts.mapped;
    this.nullable = !!opts.nullable;
    this.rescue = opts.rescue;
  }
}

interface ExpressionOpts {
  namePos?: number;
  catchall?: boolean;
  subExpressions?: Expression<any>[];
}

export abstract class Expression<Args> {
  doc: string;
  name: string;
  args: Arg<any>[];
  namePos: number;
  catchall: boolean;
  subExpressions: Expression<any>[];

  constructor(
    doc: string,
    name: string,
    args: Arg<any>[],
    opts: ExpressionOpts = {}
  ) {
    this.doc = Command.cleanDoc(doc);
    this.name = name;
    this.args = args;
    this.namePos = opts.namePos || 0;
    this.catchall = opts.catchall || false;
    this.subExpressions = opts.subExpressions || [];
  }

  getNameArgs(event: Event): [string | null, Event] {
    // Unwrap double-wrapped expressions e.g. [[Exactly, "1.0"]] -> ["Exactly", "1.0"]
    if (Array.isArray(event) && event.length === 1 && Array.isArray(event[0])) {
      const [eventInner] = event;

      return this.getNameArgs(eventInner);
    }

    // Let's allow single-length complex expressions to be passed without parens e.g. "True" -> ["True"]
    if (!Array.isArray(event)) {
      event = [event];
    }

    if (this.catchall) {
      return [this.name, event];
    } else {
      let args = event.slice();
      let [name] = args.splice(this.namePos, 1);

      if (Array.isArray(name)) {
        return [null, event];
      }

      return [name, args];
    }
  }

  matches(event: Event): boolean {
    if (this.catchall) {
      return true;
    }

    const [name, _args] = this.getNameArgs(event);

    return (
      !!name && name.toLowerCase().trim() === this.name.toLowerCase().trim()
    );
  }

  async getArgs(world: World, event: Event): Promise<Args> {
    const [_name, eventArgs] = this.getNameArgs(event);

    let initialAcc = <{ currArgs: Args; currEvents: Event }>{};

    let currArgs = <Args>{};
    let currEvents = eventArgs;

    for (const arg of this.args) {
      let val: any;
      let restEventArgs: Event;

      if (arg.nullable && currEvents.length === 0) {
        // Note this is zero-length string or zero-length array
        val = new NothingV();
        restEventArgs = currEvents;
      } else if (arg.variadic) {
        if (arg.mapped) {
          // If mapped, mapped the function over each event arg
          val = await Promise.all(
            currEvents.map((event) => arg.getter(world, event))
          );
        } else {
          val = await arg.getter(world, currEvents);
        }
        restEventArgs = [];
      } else if (arg.implicit) {
        val = await arg.getter(world);
        restEventArgs = currEvents;
      } else {
        let eventArg;

        [eventArg, ...restEventArgs] = currEvents;

        if (eventArg === undefined) {
          if (arg.defaultValue !== undefined) {
            val = arg.defaultValue;
          } else {
            throw new Error(
              `Missing argument ${arg.name} when processing ${this.name}`
            );
          }
        } else {
          try {
            if (arg.mapped) {
              val = await Promise.all(
                mustArray<Event>(eventArg).map((el) => arg.getter(world, el))
              );
            } else {
              val = await arg.getter(world, eventArg);
            }
          } catch (err) {
            if (arg.rescue) {
              val = arg.rescue;
            } else {
              throw err;
            }
          }
        }
      }

      let newArgs = {
        ...currArgs,
        [arg.name]: val,
      };

      currArgs = newArgs;
      currEvents = restEventArgs;
    }

    if (currEvents.length !== 0) {
      throw new Error(
        `Found extra args: ${currEvents.toString()} when processing ${
          this.name
        }`
      );
    }
    return currArgs;
  }

  static cleanDoc(doc: string): string {
    return doc.replace(/^\s+/gm, "").replace(/"/g, "`");
  }
}

export class Command<Args> extends Expression<Args> {
  processor: (world: World, from: string, args: Args) => Promise<World>;
  requireFrom: boolean = true;

  constructor(
    doc: string,
    name: string,
    args: Arg<any>[],
    processor: (world: World, from: string, args: Args) => Promise<World>,
    opts: ExpressionOpts = {}
  ) {
    super(doc, name, args, opts);

    this.processor = processor;
  }

  async process(
    world: World,
    from: string | null,
    event: Event
  ): Promise<World> {
    let args = await this.getArgs(world, event);

    if (this.requireFrom) {
      if (!from) {
        throw new Error(
          `From required but not given for ${this.name}. Please set a default alias or open unlocked account`
        );
      }

      return await this.processor(world, from, args);
    } else {
      return await this.processor(world, <string>(<any>null), args);
    }
  }
}

export class View<Args> extends Command<Args> {
  constructor(
    doc: string,
    name: string,
    args: Arg<any>[],
    processor: (world: World, args: Args) => Promise<World>,
    opts: ExpressionOpts = {}
  ) {
    super(doc, name, args, (world, from, args) => processor(world, args), opts);
    this.requireFrom = false;
  }
}

export class Fetcher<Args, Ret> extends Expression<Args> {
  fetcher: (world: World, args: Args) => Promise<Ret>;

  constructor(
    doc: string,
    name: string,
    args: Arg<any>[],
    fetcher: (world: World, args: Args) => Promise<Ret>,
    opts: ExpressionOpts = {}
  ) {
    super(doc, name, args, opts);

    this.fetcher = fetcher;
  }

  async fetch(world: World, event: Event): Promise<Ret> {
    let promise = this.getArgs(world, event);
    let args = await promise;
    return await this.fetcher(world, args);
  }
}

export async function processCommandEvent<Args>(
  type: string,
  commands: Command<Args>[],
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  let matchingCommand = commands.find((command) => command.matches(event));

  if (!matchingCommand) {
    throw new Error(`Found unknown ${type} event type ${event.toString()}`);
  }

  return matchingCommand.process(world, from, event);
}

export async function getFetcherValue<Args, Ret>(
  type: string,
  fetchers: Fetcher<Args, Ret>[],
  world: World,
  event: Event
): Promise<Ret> {
  let matchingFetcher = fetchers.find((fetcher) => fetcher.matches(event));

  if (!matchingFetcher) {
    throw new Error(
      `Found unknown ${type} value type ${JSON.stringify(event)}`
    );
  }

  const solution = await matchingFetcher.fetch(world, event);
  return solution;
}
