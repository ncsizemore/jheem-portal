'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { modelConfigs, type ModelConfig } from '@/config/model-configs';
import { loadMetadata, parseArtifact, selectSeries, verifiedJson, observationSource, type Artifact, type Metadata, type Stage, type Facet } from '@/utils/calibration';
import FitChart from './FitChart';

const choices = [
  { key: 'msa', id: 'ryan-white', label: '31 cities · Annals (2025)' },
  { key: 'ajph', id: 'ryan-white-state-ajph', label: '11 states · AJPH (2025)' },
  { key: 'croi', id: 'ryan-white-state-croi', label: '30 states · CROI (2026)' },
];
const selectClass = 'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 disabled:bg-slate-100';
type Result<T> = { key: string; data?: T; error?: string };

export default function CalibrationExplorer({ defaultModel = 'msa' }: { defaultModel?: string }) {
  const query = useSearchParams();
  const selected = choices.find(m => m.key === (query.get('model') ?? defaultModel));
  if (!selected) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl">Unknown calibration model</h1><Link className="underline" href="/ryan-white/calibration">Choose a Ryan White model</Link></div>;
  return <ModelExplorer key={selected.id} model={modelConfigs[selected.id]} modelKey={selected.key}/>;
}

function ModelExplorer({ model, modelKey }: { model: ModelConfig; modelKey: string }) {
  const query = useSearchParams(), router = useRouter();
  const binding = model.calibration!;
  const [metadataState, setMetadata] = useState<Result<Metadata>>({ key: '' });
  const [artifactState, setArtifact] = useState<Result<Artifact>>({ key: '' });
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState('');
  const metadataKey = `${model.id}:${retry}`;
  const metadata = metadataState.key === metadataKey ? metadataState.data : undefined;
  const locationId = query.get('loc') ?? '';
  const stageValue = query.get('stage') ?? 'ehe';
  const stage = stageValue as Stage;
  const validStage = stage === 'ehe' || stage === 'ryan-white';
  const location = metadata?.locations.find(l => l.id === locationId);
  const artifactKey = `${metadataKey}:${locationId}:${stage}`;
  const artifact = artifactState.key === artifactKey ? artifactState.data : undefined;
  const artifactRef = validStage ? location?.artifacts[stage] : undefined;
  const artifactUrl = artifactRef ? new URL(artifactRef.path, binding.manifestUrl).href : undefined;

  useEffect(() => {
    const controller = new AbortController();
    loadMetadata(binding, model.id, model.locations, controller.signal).then(data => {
      if (!controller.signal.aborted) setMetadata({ key: metadataKey, data });
    }).catch(error => {
      if (!controller.signal.aborted) setMetadata({ key: metadataKey, error: error instanceof Error ? error.message : 'Could not load calibration data.' });
    });
    return () => controller.abort();
  }, [binding, model.id, model.locations, metadataKey]);

  useEffect(() => {
    if (!metadata || !artifactRef || !artifactUrl) return;
    const controller = new AbortController();
    verifiedJson(artifactUrl, artifactRef.sha256, controller.signal, artifactRef.size_bytes).then(raw => {
      const data = parseArtifact(raw, metadata.manifest, locationId, stage);
      if (!controller.signal.aborted) setArtifact({ key: artifactKey, data });
    }).catch(error => {
      if (!controller.signal.aborted) setArtifact({ key: artifactKey, error: error instanceof Error ? error.message : 'Could not load this fit.' });
    });
    return () => controller.abort();
  }, [metadata, artifactRef, artifactUrl, artifactKey, locationId, stage]);

  function update(values: Record<string, string | null>, nextModel = modelKey) {
    const params = new URLSearchParams(query.toString());
    params.set('model', nextModel);
    for (const [key, value] of Object.entries(values)) { if (value) params.set(key, value); else params.delete(key); }
    const base = nextModel === 'msa' ? '/ryan-white/calibration' : '/ryan-white-state-level/calibration';
    router.push(`${base}?${params.toString()}`, { scroll: false });
  }
  const targetId = query.get('target');
  const target = artifact?.targets.find(t => t.target_id === targetId) ?? (!targetId ? artifact?.targets.find(t => t.availability.status === 'available') ?? artifact?.targets[0] : undefined);
  const requestedFacet = query.get('facet') ?? 'total';
  const facet = requestedFacet as Facet;
  const validFacet = binding.displayFacets.includes(facet);
  const ages = [...new Set(target?.panels.find(p => p.facet === 'age')?.posterior.map(p => p.stratum.age) ?? [])].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  const age = query.get('age') ?? ages[0] ?? '';
  const series = target && validFacet ? selectSeries(target, facet, age) : undefined;
  const error = (metadataState.key === metadataKey ? metadataState.error : undefined) ?? (artifactState.key === artifactKey ? artifactState.error : undefined);
  const invalid = !validStage ? 'Unknown fit stage. Choose a stage below.' : locationId && metadata && !location ? 'This location is not included in the selected model.' : !validFacet ? 'This stratification is not available in the reviewed release.' : targetId && artifact && !target ? 'This target is not included in the selected fit.' : facet === 'age' && target && ages.length > 0 && !ages.includes(age) ? 'This age group is not available for this target.' : '';
  const stageInfo = validStage ? metadata?.manifest.stages[stage] : undefined;
  const sources = [...new Set(series?.observations.flatMap(p => p.public_source_ids) ?? [])];

  return <div className="w-full bg-[#f7f9fb] min-h-screen">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.16em] font-semibold text-hopkins-blue">Ryan White · Model evidence</p>
          <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl" style={{fontFamily:'var(--font-newsreader)'}}>How well does the model fit?</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">Compare model estimates with observed HIV and service data. Explore the epidemic baseline and the Ryan White service fit separately to understand the evidence behind each analysis.</p>
        </div>
        <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-hopkins-blue" onClick={async () => {
          try { await navigator.clipboard.writeText(window.location.href); setCopied('Link copied'); }
          catch { setCopied('Copy the address from your browser to share this view.'); }
        }}>Share this view</button>
      </div>
      <p role="status" className="mt-1 text-sm text-slate-600">{copied}</p>

      <div className="mt-7 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3 sm:p-6">
        <label className="text-sm font-medium text-slate-700">1 Model<select aria-label="Model" className={selectClass} value={modelKey} onChange={e => update({loc:null,target:null,age:null}, e.target.value)}>{choices.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">2 {model.geographyLabel}<select aria-label="Location" className={selectClass} disabled={!metadata} value={location ? locationId : ''} onChange={e => update({loc:e.target.value,target:null,age:null})}><option value="">Choose a {model.geographyLabel.toLowerCase()}</option>{metadata?.locations.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">3 Fit stage<select aria-label="Fit stage" className={selectClass} value={validStage ? stage : ''} onChange={e => update({stage:e.target.value,target:null,facet:null,age:null})}>{!validStage && <option value="">Choose a stage</option>}<option value="ehe">Epidemic baseline fit</option><option value="ryan-white">Ryan White service fit</option></select></label>
      </div>

      {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 text-red-900"><p>{error}</p><button className="mt-3 underline font-medium" onClick={() => setRetry(v => v+1)}>Retry loading</button></div>}
      {invalid && <p role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">{invalid}</p>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-7" aria-label="Calibration results" aria-busy={Boolean(!error && (!metadata || (location && !artifact)))}>
          {!error && !invalid && (!metadata ? <p role="status" className="py-16 text-center text-slate-500">Loading model information…</p> : !location ? <div className="py-16 text-center"><h2 className="text-xl text-slate-800">Start with a location</h2><p className="mt-2 text-slate-500">Choose a {model.geographyLabel.toLowerCase()} above to explore the model evidence.</p></div> : !artifact ? <p role="status" className="py-16 text-center text-slate-500">Loading fit for {location.label}…</p> : null)}
          {artifact && !error && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">4 Target<select aria-label="Target" className={selectClass} value={target?.target_id ?? ''} onChange={e => update({target:e.target.value,age:null})}>{!target && <option value="">Choose a target</option>}{artifact.targets.map(t => <option key={t.target_id} value={t.target_id}>{t.label}{t.availability.status === 'available' ? '' : ' (unavailable)'}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">5 Stratification<select aria-label="Stratification" className={selectClass} value={validFacet ? facet : ''} onChange={e => update({facet:e.target.value,age:null})}>{!validFacet && <option value="">Choose a stratification</option>}<option value="total">Total</option><option value="age">Age group</option></select></label>
            </div>
            {facet === 'age' && ages.length > 0 && <label className="mt-4 block max-w-xs text-sm font-medium text-slate-700">Age group<select aria-label="Age group" className={selectClass} value={age} onChange={e => update({age:e.target.value})}>{ages.map(a => <option key={a}>{a}</option>)}</select></label>}
            {target && !invalid && <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{target.public_panel === 'calibration_target' ? 'Calibration target' : target.public_panel === 'not_exported' ? 'Not exported' : 'Model-fit check'} · {facet === 'age' ? age || 'Age group' : 'Total'}</p>
              <h2 className="mt-2 text-xl font-semibold leading-snug text-slate-900">{target.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{location?.label} · {target.unit.includes('proportion') ? 'Percent' : target.unit === 'people' ? 'People' : target.unit.replaceAll('_',' ')}</p>
              {target.availability.status !== 'available' ? <p className="my-7 rounded-md bg-slate-50 p-5 text-slate-600">{target.availability.status === 'not_exported' ? 'This fitting target is not exported in the reviewed release.' : 'Observed data are unavailable for this target and location.'} Other targets remain available above.</p> : !target.panels.some(p => p.facet === facet) ? <p className="my-7 text-slate-600">This target is not available by {facet === 'age' ? 'age group' : 'total'}. Choose another stratification.</p> : <div className="mt-5">{series && <FitChart {...series} unit={target.unit} label={target.label}/>}</div>}
              {target.public_panel.includes('fit_check') && <p className="mt-5 text-sm leading-relaxed text-slate-600">This is a model-fit check. The displayed summary may differ from the individual quantities used in the model’s likelihood.</p>}
              {new Set(series?.observations.map(observationSource)).size > 1 && <p className="mt-4 text-sm leading-relaxed text-slate-600">Multiple observed series are shown separately. Their geographic construction or reporting source can differ; the symbols and data table identify each series.</p>}
              {target.observation_location_binding === 'nested_likelihood_locations' && <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-950">The model uses observations from related geographic areas for this check. These are not necessarily city-level measurements; each observation’s geography is preserved in the data table.</p>}
              {target.observation_provenance_confidence === 'reconstructed' && <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-950">The observation provenance for this target is reconstructed. This does not establish the identity of the original fitting data manager.</p>}
              {sources.length > 0 && <p className="mt-4 text-xs leading-relaxed text-slate-500">Observation source identifiers: {sources.join(', ')}. Full provenance is available in the source data.</p>}
            </div>}
          </>}
        </section>
        <aside className="space-y-6 text-sm text-slate-600">
          <section><h2 className="font-semibold text-slate-900">About this fit</h2><p className="mt-2 leading-relaxed">{stage === 'ryan-white' ? 'How the model represents use of Ryan White services and viral suppression among service recipients.' : 'How the underlying epidemic model compares with observed HIV diagnoses, prevalence, and prevention measures.'}</p>
            {stageInfo && <p className="mt-3 text-lg font-semibold text-hopkins-blue">{stageInfo.sample_count.toLocaleString()} posterior simulations</p>}
            {stage === 'ryan-white' && modelKey === 'msa' && <p className="mt-2 leading-relaxed">The deployed city service fit uses a deliberately thinned 80-draw ensemble.</p>}
          </section>
          <section className="border-t border-slate-200 pt-5"><h2 className="font-semibold text-slate-900">Reading the chart</h2><p className="mt-2 leading-relaxed">The line is the model median. Shaded bands show the central 50% and 95% of posterior estimates. Symbols show observed data.</p><p className="mt-3 leading-relaxed">Only years covered by displayed observations within the target’s fitting window are shown. These intervals describe model uncertainty, not uncertainty in the observed points.</p><p className="mt-3 leading-relaxed">Agreement with fitting data is a model check, not independent validation of future projections.</p></section>
          <details className="border-t border-slate-200 pt-5"><summary className="cursor-pointer font-semibold text-slate-900">Release &amp; source data</summary><div className="mt-3 space-y-3 break-words text-xs">
            <p>Calibration release: {binding.release}</p><p>Simulation source: {stageInfo?.simulation_release ?? 'Select a fit stage'}</p>
            <a className="block underline text-hopkins-blue" href={binding.manifestUrl} target="_blank" rel="noreferrer">View model manifest (JSON)</a>
            {artifactUrl && <a className="block underline text-hopkins-blue" href={artifactUrl} target="_blank" rel="noreferrer">View location fit data (JSON)</a>}
            <a className="block underline text-hopkins-blue" href={`https://github.com/CIPHER-Epi/jheem-simulations/releases/tag/${binding.release}`} target="_blank" rel="noreferrer">Archived release and reuse information</a>
            <p>Files are checked against the release checksums before display.</p>
          </div></details>
        </aside>
      </div>
      <p className="mt-8 text-sm text-slate-500">Explore interruption scenarios in the <Link className="underline text-hopkins-blue" href={modelKey === 'msa' ? '/ryan-white/explorer' : `/ryan-white-state-level/explorer/${modelKey}`}>pre-run explorer</Link>.</p>
    </div>
  </div>;
}
