## Contributing to Polingo

Thanks for taking the time to contribute! We want Polingo to be a friendly and productive place to collaborate. By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

### Before You Start
- Make sure you have Node.js `>= 18.0.0` and pnpm `>= 8.0.0`.
- Install dependencies with `pnpm install` (or `make install` if you prefer the shortcuts in our Makefile).
- Familiarize yourself with the repo layout in `packages/`; each package has its own build scripts and README.

### Ways to Contribute
- **Bug reports:** Search existing issues first. Include reproduction steps, expected vs. actual behavior, and environment details.
- **Feature requests:** Describe the use case, possible API, and how it fits the project goals.
- **Code changes:** Fork the repo, create a feature branch, and submit a pull request (PR).
- **Docs & examples:** Improvements to README files, demos, or comments are always welcome.

### Development Workflow
1. **Fork and clone:**  
   ```bash
   git clone https://github.com/<your-username>/polingo.git
   cd polingo
   git remote add upstream https://github.com/ragnarok22/polingo.git
   ```
2. **Create a branch:** Use a descriptive name such as `feature/hot-reload-improvements` or `fix/pluralization-edge-case`.
3. **Install dependencies:** `pnpm install`
4. **Make your changes:** Keep each PR focused on a single topic when possible. Add tests and docs alongside code.
5. **Run checks locally:**  
   ```bash
   pnpm lint
   pnpm test
   pnpm typecheck
   pnpm build
   ```
   You can also use the equivalent `make` targets (`make lint`, `make test`, etc.).
6. **Commit:** Use clear commit messages. Conventional commit prefixes (e.g. `feat:`, `fix:`) are encouraged but not required.
7. **Rebase if needed:** Keep your branch current with `main` (`git fetch upstream && git rebase upstream/main`).
8. **Open a PR:** Fill out the template completely. Explain the problem, the solution, and any trade-offs.

### Pull Request Checklist
- Tests cover new behavior or regressions.
- `pnpm lint` and `pnpm typecheck` pass.
- Documentation, examples, or comments updated when behavior changes.
- Any new npm dependency includes a justification in the PR description.
- Screenshots or recordings included for UI-affecting changes (if applicable).

### Version Management
- We use [Changesets](https://github.com/changesets/changesets) to manage package versions and changelogs.
- For any change that affects published packages, run `pnpm run changeset` and follow the prompts to create a changeset file.
- Each changeset should describe the change and mark the appropriate packages with a `patch`, `minor`, or `major` bump.
- After changesets land on `main`, maintainers run `pnpm run version-packages` to apply version bumps, and `pnpm run release` when publishing to npm.

### Reviewing and Merging
- Maintainers aim to review PRs within a few business days.
- Address review feedback promptly; push follow-up commits instead of force-pushing unless asked.
- Once approved, a maintainer will handle the merge. Contributors should not self-merge unless explicitly invited.

### Security & Responsible Disclosure
Please do **not** open public issues for security concerns. Follow the [security policy](.github/SECURITY.md) for responsible disclosure guidelines and allow maintainers time to investigate before public disclosure.

### Need Help?
If you have questions about contributing, open a discussion or reach out to the maintainers through GitHub issues. For conduct-related matters, please open an issue or contact the repository maintainers directly through GitHub.

We appreciate your contributions—thank you for helping make Polingo better!
