"""Export selected, rounded report-level values for the restricted judge view."""
import argparse
import csv
import json
from pathlib import Path

def read(root, file):
    with (root / file).open(newline='') as stream:
        return list(csv.DictReader(stream))

def score(row):
    return round(float(row['shrunk_contribution']), 4)

def generate(root, comparisons):
    result = {'schema': 1, 'kind': 'submission'}
    for role, group in [('striker','batting'),('bowler','bowling')]:
        order=read(root,f'{role}_submission_order.csv')
        historical=read(root,f'{role}_primary_w10.csv')
        ranks={r['player_id']:r for r in order}
        alternatives = set(comparisons.get(group, []))
        candidates=order+[r for r in historical if r['name'] in alternatives and r['eligible']=='True' and r['player_id'] not in ranks]
        robustness={r['player_id']:r for r in read(root,f'{role}_reliability_summary.csv')}
        ids={r['player_id'] for r in candidates}
        grids={key:{} for key in ids}
        for r in read(root,f'{role}_specification_ranks.csv'):
            if r['player_id'] not in ids: continue
            key=r['specification']
            if key.startswith('grid_'):
                grids[r['player_id']][key]=int(r['rank'])
        players=[]
        for r in candidates:
            evidence=robustness.get(r['player_id'],{})
            players.append({'name':r['name'],'rank':int(ranks[r['player_id']]['submission_rank']) if r['player_id'] in ranks else None,
                'historyRank':int(float(r['eligible_rank'])),'score':score(r),'events':int(r['pressure_events']),
                'matches':int(r['pressure_matches']),'pressure':round(float(r['pressure_contribution']),3),
                'ordinary':round(float(r['usual_contribution']),3),'interval':[round(float(r['ci_low']),3),round(float(r['ci_high']),3)],
                'gridTop':int(evidence['grid_top10']) if evidence else None,
                'gridEligible':int(evidence['grid_eligible']) if evidence else None,
                'looTop':int(evidence['loo_top10']) if evidence else None,
                'looTotal':int(evidence['loo_total']) if evidence else None,
                'scenarios':grids[r['player_id']]})
        assert len(order)==10 and [p['rank'] for p in players[:10]]==list(range(1,11))
        result[group]=players
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--results',type=Path,required=True)
    p.add_argument('--comparisons', type=Path, help='Private JSON file of optional player names by role')
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    comparisons = json.loads(a.comparisons.read_text(encoding='utf-8')) if a.comparisons else {}
    a.output.write_text(json.dumps(generate(a.results, comparisons),separators=(',',':'))+'\n', encoding='utf-8')
