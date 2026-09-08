import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { parseArtifact, parseMetadata, selectSeries, verifiedJson } from '../src/utils/calibration.ts';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stageInfo = { label: 'Fit', sample_count: 80, simulation_release: 'test-sim', target_ids: ['test-target'] };
const manifest = { schema_version: 'jheem-calibration-manifest/v1', release: 'test-release', model: 'test-model', portal_model: 'test-portal', stages: { ehe: stageInfo, 'ryan-white': stageInfo } };
const index = { schema_version: 'jheem-calibration-location-index/v1', release: 'test-release', model: 'test-model', portal_model: 'test-portal', locations: [{ id: 'AA', label: 'Test place', artifacts: Object.fromEntries(['ehe','ryan-white'].map(stage => [stage,{path:`locations/AA/${stage}.json`,size_bytes:100,sha256:'a'.repeat(64)}])) }] };
const point = { year: 2020, stratum: {}, q025: 1, q250: 2, q500: 3, q750: 4, q975: 5 };
const observed = { year: 2020, stratum: {location: 'AA'}, value: 3, manager_source: 'test', manager_ontology: 'test', public_source_ids: ['source'] };
const target = { target_id:'test-target',label:'Test target',unit:'people',public_panel:'model_fit_check',observation_location_binding:'nested_likelihood_locations',observation_provenance_confidence:'reconstructed',likelihood_year_window:{from_year:2019,to_year:2021},availability:{status:'available',reason:null},panels:[{facet:'total',posterior:[point],observations:[observed]}] };
const artifact = {schema_version:'jheem-calibration/v1',artifact_id:'test-model:ryan-white:AA',model:'test-model',location:'AA',stage:'ryan-white',ensemble:{sample_count:80},simulation_source:{release:'test-sim',sha256:'a'.repeat(64)},targets:[target]};

test('rejects altered bytes before parsing even when JSON is valid', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('{"changed":true}'));
  await assert.rejects(verifiedJson('https://example.test', hash('{}')), /could not be verified/);
});
test('accepts exact bytes and rejects size mismatches and HTTP failures', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  assert.deepEqual(await verifiedJson('https://example.test',hash('{}')),{});
  await assert.rejects(verifiedJson('https://example.test',hash('{}'),undefined,99), /size did not match/);
  context.mock.method(globalThis, 'fetch', async () => new Response('',{status:503}));
  await assert.rejects(verifiedJson('https://example.test',hash('{}')), /could not be loaded/);
});
test('metadata must match the model, release, complete location set and safe artifact paths', () => {
  const binding={release:'test-release'};
  assert.equal(parseMetadata(manifest,index,binding,'test-portal',['AA']).locations.length,1);
  for (const mutate of [i=>{i.model='wrong';},i=>{i.locations=[];},i=>{i.locations[0].artifacts.ehe.path='../other.json';}]) {
    const changed=structuredClone(index); mutate(changed);
    assert.throws(()=>parseMetadata(manifest,changed,binding,'test-portal',['AA']));
  }
});
test('chart artifacts must match the location, stage, ensemble and scientific shape', () => {
  assert.equal(parseArtifact(artifact,manifest,'AA','ryan-white').ensemble.sample_count,80);
  for (const mutate of [a=>{a.location='BB';},a=>{a.ensemble.sample_count=1000;},a=>{a.targets[0].panels[0].posterior[0].q975=0;},a=>{a.targets[0].panels[0].observations[0].public_source_ids=[];}]) {
    const changed=structuredClone(artifact); mutate(changed);
    assert.throws(()=>parseArtifact(changed,manifest,'AA','ryan-white'));
  }
});
test('selection excludes projection years and preserves separate nested observations', () => {
  const changed=structuredClone(target);
  changed.panels[0].posterior.push({...point,year:2030});
  changed.panels[0].observations.push({...observed,stratum:{location:'BB'},value:4}, {...observed,year:2025});
  const selected=selectSeries(changed,'total','');
  assert.deepEqual(selected.posterior.map(p=>p.year),[2020]);
  assert.deepEqual(selected.observations.map(p=>p.value),[3,4]);
});
test('age selection matches strata without mixing totals or other ages', () => {
  const changed=structuredClone(target);
  changed.panels.push({facet:'age',posterior:[{...point,stratum:{age:'13-24 years'}},{...point,stratum:{age:'25-34 years'}}],observations:[{...observed,stratum:{location:'AA',age:'13-24 years'}}]});
  assert.equal(selectSeries(changed,'age','13-24 years').posterior.length,1);
  assert.equal(selectSeries(changed,'age','25-34 years').observations.length,0);
});
