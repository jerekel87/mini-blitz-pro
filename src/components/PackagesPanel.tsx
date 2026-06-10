import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Package, Loader2 } from 'lucide-react';
import type { FlatFiles } from '../types';
import { getWebContainer, streamProcessOutput, waitForExit } from '../lib/webcontainer';

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
}

interface PackagesPanelProps {
  files: FlatFiles;
  onUpdateFile: (path: string, content: string) => void;
  onLog: (data: string) => void;
  embedded?: boolean;
}

export function PackagesPanel({ files, onUpdateFile, onLog, embedded = false }: PackagesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  // Parse current package.json
  const pkgJson = React.useMemo(() => {
    try {
      return JSON.parse(files['package.json'] || '{}');
    } catch {
      return {};
    }
  }, [files]);

  const dependencies = pkgJson.dependencies || {};
  const devDependencies = pkgJson.devDependencies || {};

  const allDeps = [
    ...Object.entries(dependencies).map(([name, version]) => ({ name, version: version as string, dev: false })),
    ...Object.entries(devDependencies).map(([name, version]) => ({ name, version: version as string, dev: true })),
  ];

  // Debounced npm search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=8`
        );
        const data = await res.json();
        const results: PackageInfo[] = (data.objects || []).map((obj: any) => ({
          name: obj.package.name,
          version: obj.package.version,
          description: obj.package.description,
        }));
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updatePackageJson = useCallback((name: string, version: string, isDev: boolean, remove = false) => {
    const current = { ...pkgJson };
    const section = isDev ? 'devDependencies' : 'dependencies';

    if (!current[section]) current[section] = {};

    if (remove) {
      delete current[section][name];
      if (Object.keys(current[section]).length === 0) delete current[section];
    } else {
      current[section][name] = version;
    }

    // Keep other fields
    const newContent = JSON.stringify(current, null, 2);
    onUpdateFile('package.json', newContent);
    return newContent;
  }, [pkgJson, onUpdateFile]);

  const handleInstall = async (name: string, version = 'latest', isDev = false) => {
    if (installing) return;
    setInstalling(name);

    try {
      // Update package.json
      const versionToUse = version === 'latest' ? '*' : `^${version}`;
      updatePackageJson(name, versionToUse, isDev);

      // Run npm install
      onLog(`\r\n\x1b[36m$ npm install ${name}${isDev ? ' --save-dev' : ''}\x1b[0m\r\n`);

      const wc = await getWebContainer();
      const args = ['install', name];
      if (isDev) args.push('--save-dev');

      const proc = await wc.spawn('npm', args);
      streamProcessOutput(proc, onLog);

      const code = await waitForExit(proc);
      if (code === 0) {
        onLog('\r\n\x1b[32m✓ Package installed successfully\x1b[0m\r\n');
      } else {
        onLog(`\r\n\x1b[31m✗ npm install exited with code ${code}\x1b[0m\r\n`);
      }
    } catch (e: any) {
      onLog(`\r\n\x1b[31mError installing ${name}: ${e.message}\x1b[0m\r\n`);
    } finally {
      setInstalling(null);
    }
  };

  const handleRemove = async (name: string, isDev: boolean) => {
    updatePackageJson(name, '', isDev, true);

    onLog(`\r\n\x1b[36m$ npm uninstall ${name}${isDev ? ' --save-dev' : ''}\x1b[0m\r\n`);

    try {
      const wc = await getWebContainer();
      const args = ['uninstall', name];
      if (isDev) args.push('--save-dev');

      const proc = await wc.spawn('npm', args);
      streamProcessOutput(proc, onLog);
      await waitForExit(proc);
      onLog('\r\n\x1b[32m✓ Package removed\x1b[0m\r\n');
    } catch (e: any) {
      onLog(`\r\n\x1b[31mError: ${e.message}\x1b[0m\r\n`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#111] text-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs font-medium text-white/70">
        <Package className="h-3.5 w-3.5" />
        DEPENDENCIES
      </div>

      {/* Current packages */}
      <div className="border-b border-white/10 p-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/50">Installed</div>
        {allDeps.length === 0 && (
          <div className="text-xs text-white/40">No dependencies yet. Search below to add.</div>
        )}
        <div className="max-h-40 space-y-1 overflow-auto pr-1 text-xs">
          {allDeps.map(({ name, version, dev }) => (
            <div key={name} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-white">{name}</span>
                <span className="ml-1.5 text-white/50">{version}</span>
                {dev && <span className="ml-1 text-[10px] text-amber-400/80">(dev)</span>}
              </div>
              <button
                onClick={() => handleRemove(name, dev)}
                className="ml-2 rounded p-0.5 text-white/50 hover:bg-red-500/20 hover:text-red-400"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex-1 overflow-auto p-3">
        <div className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search npm packages..."
            className="w-full rounded-md border border-white/10 bg-black/40 py-1.5 pl-8 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-white/40" />
          {searching && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-white/40" />}
        </div>

        <div className="space-y-1.5">
          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="text-xs text-white/40">No results for “{searchQuery}”</div>
          )}
          {searchResults.map((pkg) => {
            const alreadyInstalled = allDeps.some((d) => d.name === pkg.name);
            return (
              <div key={pkg.name} className="rounded-md border border-white/10 bg-white/5 p-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white">{pkg.name}</div>
                    <div className="line-clamp-2 text-[11px] text-white/60">{pkg.description}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-white/40">v{pkg.version}</div>
                  </div>
                  <button
                    disabled={alreadyInstalled || !!installing}
                    onClick={() => handleInstall(pkg.name, pkg.version)}
                    className="flex shrink-0 items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {installing === pkg.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {alreadyInstalled ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[10px] text-white/40">
          Installing updates <span className="font-mono">package.json</span> and runs <span className="font-mono">npm install</span> inside the container.
        </div>
      </div>
    </div>
  );
}
