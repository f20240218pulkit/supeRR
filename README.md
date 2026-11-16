# SupeRR Selector | Round 1 dashboard

The dashboard opens straight to the submission rankings. Switch between batting and bowling, compare players, and change the assumptions to see how historical ranks move. The build produces a self-contained HTML page using report-level summaries from the final analysis.

## Build locally

Use Node 22. Keep the results export outside the checkout.

```sh
npm run build -- ../SupeRR_Judge_Aggregates.private.json
npm run dev
```

The single page at `dist/index.html` can also be opened directly in a browser. It includes the analysis summaries and can be viewed offline.

## Deploy on Vercel

Import this repository using the **Other** framework preset. The repository config sets `npm run build` and `dist`. Set `RR_DASHBOARD_RESULTS` to the report-level results export for the intended deployment environment, then build. The deployment serves the summaries to everyone who can open its URL. Use an open URL only if the competition organizer permits public access to those summaries. Keep the data pack and delivery-level records out of the project.

Before entering a dashboard URL on Unstop, open the production URL in a signed-out browser. Check that it opens straight to the real shortlist, that both lists match the final PDF, and that the comparison and scenario controls work.

## Refresh the results export

```sh
python scripts/export_aggregates.py --results /path/to/final-analysis/results --comparisons /path/to/comparison-players.json --output ../SupeRR_Judge_Aggregates.private.json
```

The optional comparisons file is a JSON object with `batting` and `bowling` arrays of player names. Keep it with the private analysis. Scenario ranks are historical and cover the full eligible pool before the auction screen.
