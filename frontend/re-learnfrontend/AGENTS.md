<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep the app on TanStack Start file-based routes and put mockable learning data behind `src/services/api.ts`; this keeps the existing framework intact and lets the UI swap its data source later.
- Keep cross-route learner progress and presentation toggles in a shared React context; the demo must remain navigable without a backend.
