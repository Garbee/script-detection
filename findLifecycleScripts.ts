import { glob } from 'node:fs/promises'
import type { PackageJSON } from '@npm/types';

/**
 * Information about a package with lifecycle scripts to
 * be audited.
 */
interface LifecycleScriptInfo {
  /**
   * The name of the package.
   */
  name: string;
  /**
   * The installed version.
   */
  version: string;
  /**
   * The lifecycle scripts present in the package.
   */
  scripts: {
    [key: string]: string;
  };
  /**
   * The path to the package.json file. Useful in determining
   * if the package is not hoisted.
   */
  path: string;
}

/**
 * The scripts of concern when installing packages.
 */
const LIFECYCLE_SCRIPTS = ["preinstall", "install", "postinstall"];

/**
 * Find all lifecycle scripts in the node_modules directory.
 *
 * @param rootPath The root path to a `node_modules` directory to search within.
 *
 * @returns A promise that resolves to an array of information on packages with concerning lifecycle scripts.
 */
async function findLifecycleScripts(rootPath: string): Promise<LifecycleScriptInfo[]> {
  const results: LifecycleScriptInfo[] = [];

  for await (const file of glob(`${rootPath}/**/package.json`)) {
    let pkg: PackageJSON;
    try {
      pkg = await import(file, { with: { type: "json" } });
    } catch (e) {
      console.error(`Failed to import ${file}:`, e);
      continue;
    }

    const {scripts} = pkg;

    if (!scripts) {
      continue;
    }

    const lifecycleKeys = LIFECYCLE_SCRIPTS.filter(k => k in scripts);

    if (lifecycleKeys.length === 0) {
      continue;
    }

    const scriptsOfConcern = lifecycleKeys.map(k => [k, scripts[k]!]);

    results.push({
      name: pkg.name,
      version: pkg.version,
      scripts: Object.fromEntries(scriptsOfConcern),
      path: file,
    });
  }

  return results;
}

export {
  findLifecycleScripts,
};
