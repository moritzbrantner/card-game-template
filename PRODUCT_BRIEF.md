# Product Brief

## Summary

Build a reusable card-game template that supports simple and complex card games across desktop, web, and mobile.

## Problem

Most game starters cover only one platform or mix gameplay rules directly into app-specific code. This project needs a structure where card-game logic can be shared, multiplayer can be added cleanly, and player identity plus match history are built in.

## Product goals

- support card games from simple UNO-like rules to more complex rule sets
- allow play on desktop, web, and mobile
- support playing with other people online
- require player accounts
- track player results over time
- make game logic portable between local execution and server execution

## Non-goals for the initial template

- building a single hard-coded game only
- tying gameplay rules to one client framework
- relying only on peer-to-peer trust for online results

## Primary users

- developers using the repository as a starter for new card games
- players who want the same account and game identity across devices

## Success criteria

- a new game can be added by implementing shared rules and platform presentation
- the same match logic works in solo/local mode and online mode
- authenticated players can see their recorded results
- at least one simple game and one more advanced game can fit the architecture without major rewrites
