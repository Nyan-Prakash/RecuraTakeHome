# Fullstack Take-Home Assignment

## Goal

This exercise is meant to make your engineering judgment visible. We want to see how you interpret an ambiguous product prompt, choose scope under time constraints, structure a fullstack application, reason about trade-offs, and explain your decisions.

We're going to be evaluating you on the following:

- clear/sensible code patterns
- functionality + validation
- readability

This assignment is designed to take less than 6 hours with AI-assisted code development. A focused, well-executed slice is better than a large build.

## Assignment

Build a workflow automation tool where users can define triggers, chain actions, and execute workflows. The system should include an AI-powered action step as a first-class part of the execution engine.

The product should support a simple automation flow: a user defines a trigger condition, adds one or more actions to run when triggered, and the system executes them. One of the available action types should be AI-powered.

**Workflows must actually execute.** When we run your app locally, we need to be able to define a workflow, fire a trigger, and watch the actions run. This is non-negotiable.

The exact product shape is intentionally unspecified. Choose a narrow interpretation and implement it well.

You may use AI tools during development.

## Requirements

### Setup

- Use whatever language, framework, and stack you're most comfortable with
- Must run locally with clear setup instructions
- Include a README.md (entirely human written)

### Functionality

- Define workflows with at least a trigger and one or more actions
- Execute workflows end-to-end when a trigger fires
- Include an AI-powered action step as one of the available action types
- View workflow execution status or history

### Code Quality

- Demonstrate strong architectural patterns: clear separation of concerns, modular structure, and maintainable code organization

## AI

Include an AI-powered action type that does something meaningful within a workflow execution. You may stub or simulate model responses if needed.

Examples: summarize incoming data, classify or route content, transform text, generate a response based on prior steps.

## Scope

Some aspects of the product are intentionally unspecified. You should decide what triggers look like, how complex workflows can be, what the builder experience looks like, what happens when an action fails, and where to spend your 6 hours.

Explain those decisions in the README.

## README

The README must achieve two things: setup and help us understand your reasoning. **Your README must be entirely human written. If your README is AI generated, I will be very angry.**

Should include:

- Setup instructions
- Tradeoffs
- Stubs / Unhandled Edge Cases (what's known incomplete)
- Key decisions

Should not include:

- File structure or location
- BS/Fluff

## How to Submit

This is a template repository. Create a new private repository from this template:

1. Click "Use this template" → "Create a new repository"
2. Make the repository private
3. Clone your new repository locally
4. Complete the assignment in your repository
5. Once done, share the repository with @jakezegil, @danielgavidia, @SamuelRCrider

Your submission should include:

- the project
- a README.md (entirely human written)
- setup instructions in the README
- a short video (I recommend Loom) of you walking through your repository in your preferred IDE

## The Video

- The video (<5m) should be you sharing your code and include the following:
  - an architectural overview
  - a walk through of your data models
  - a brief explanation of each part of your codebase/how it works / why it's necessary
  - as you walk through, emphasizing what you would change in a production codebase shared with a team
