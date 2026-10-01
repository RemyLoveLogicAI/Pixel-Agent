// @hermes/office — Pixel Office integration layer.
// District system, scene composition, and artifact management.

export { DistrictManager, type DistrictConfig } from './district/DistrictManager.js';
export { ScenarioEngine, type SceneBinding } from './scene/ScenarioEngine.js';
export { ArtifactSystem, type ArtifactDefinition } from './artifact/ArtifactSystem.js';
export {
  DEFAULT_DISTRICTS,
  type DistrictName,
  type ArtifactType,
} from './data/districts.js';
