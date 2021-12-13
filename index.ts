#!/usr/bin/env node

import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Listr } from "listr2";

interface Ctx {
  octokit: Octokit;
  targets: string[];
  user: RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"];
  repos: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];
}

const main = async () => {
  const tasks = new Listr<Ctx>([
    {
      title: "Authenticating",
      task: async (ctx, task) => {
        const auth = await task.prompt({
          type: "Password",
          message: "Enter your GitHub token",
        });

        ctx.octokit = new Octokit({ auth });

        const user = await ctx.octokit.users.getAuthenticated();
        const repos = await ctx.octokit.repos.listForAuthenticatedUser();

        ctx.user = user.data;
        ctx.repos = repos.data;
      },
    },
    {
      title: "Selecting repositories",
      task: async (ctx, task) => {
        ctx.targets = await task.prompt({
          type: "MultiSelect",
          message: "Please select repositories you want to delete",
          choices: ctx.repos.map((repo) => ({
            name: repo.name,
            message: `${repo.name} ${repo.private ? "(private)" : ""}`,
          })),
        });
      },
    },
    {
      title: "Deleting repositories",
      task: async (ctx) => {
        const promises = ctx.targets.map((target) =>
          ctx.octokit.repos.delete({
            repo: target,
            owner: ctx.user.login,
          })
        );

        return Promise.all(promises);
      },
    },
  ]);

  await tasks.run();
};

main();
