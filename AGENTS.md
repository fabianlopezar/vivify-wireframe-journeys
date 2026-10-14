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

- Keep the uploaded wireframe geometry and content in a shared screen definition consumed by a semantic renderer, so all exported screens retain their visual parity.
- Prototype interactions use session-only React context, not persistent storage, because real accounts and saved bookings are outside the confirmed scope.
- Render named wireframe screens through the typed `/pantallas/$pantalla` route with screen-specific metadata; `/` opens provider exploration.
