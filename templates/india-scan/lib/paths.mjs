import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** local/india-scan */
export const INDIA_SCAN_ROOT = join(__dirname, '..');

/** career-ops repo root */
export const CAREER_OPS_ROOT = join(INDIA_SCAN_ROOT, '..', '..');

export const BROWSER_DATA_DIR = join(INDIA_SCAN_ROOT, '.browser-data');
export const CONFIG_PATH = join(INDIA_SCAN_ROOT, 'config.yml');
export const CONFIG_EXAMPLE_PATH = join(INDIA_SCAN_ROOT, 'config.example.yml');
