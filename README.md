# Repo Profile Sync Template

This template makes each push notify `Olabits-Dev/Olabits-Dev` so your profile activity workflow can update automatically.

## Fastest way for future repos

Run this local command:

```bash
create-profile-synced-repo <new-repo-name> --public
```

It will:
- create the repo from this template
- set `PROFILE_UPDATE_TOKEN` automatically

## Required once per new repo

1. Go to `Settings` -> `Secrets and variables` -> `Actions`.
2. Add secret `PROFILE_UPDATE_TOKEN`.
3. Value should be a PAT from `Olabits-Dev` with `repo` scope (or `public_repo` for only public repos).

After that, every push to the repo triggers your profile update workflow.
