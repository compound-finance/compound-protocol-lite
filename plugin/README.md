# Compound Protocol Lite

Experimental [Hardhat](https://hardhat.org/) plugin.

## how to use

first build it (npx tsc)

load the compiled output as a library in hardhat.config.js

e.g. require("plugin/dist/index")

## what is it


i took the scenario repl runner thing out of the compound repo

i then replaced all uses of ganache with the compound network,

all calls to truffle/saddle with hardhat

and am also using hardhat to get artifacts

its all very messy right now and im sure there are things that i haven't changed or don't work



so what it does is it adds a "repl" object to the global context.
this repl object can be used to evaluate scenario runner, either inputting a line or multiple lines
later i'll make something so we can do something like npx hardhat repl --file file.scen

i pass your input string to the same thing that was responsible for parsing a line in the old repl runner
so this should be compatible (as long as all the contract calls, config options, etc work). i'm pretty sure aliases are broken

ideally we can use this, preserving our current tests, while we/i/someone works on writing a javascript based scenario/test runner
so we can continue to use mocha&chai, and making the centora tests easier to integrate with hopefully as well


## long todo list that i will add to and im sure is missing everything and is in no particular order

- update all the contract interfaces for better code completion
- the invokation layer is still really hacky. clean it up. maybe redesign it to better fit ethers
- the number and return types everywhere are really messed up bc of switching from web3 to ethers, so fix that
- reorganize location of events so that individual files are smaller (i love typescript...)
- add file running capability
- test all existing scenarios and make sure that they run (progress 0/???)
- switch the printer to use the hardhat error printer and related
- fix that weird promise{thing} that is appearing whenever i send a command im sorry :(
