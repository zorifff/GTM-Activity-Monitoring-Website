import { startInfra } from './infra.js';

export default async function globalSetup() {
  await startInfra();
}
