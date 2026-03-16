#!/usr/bin/env npx tsx
/**
 * senscritique-export.ts
 *
 * Extrait les notes et dates de complétion d'une collection SensCritique
 * et les exporte en JSON.
 *
 * Usage:
 *   npx tsx tools/senscritique-export.ts <username> [options]
 *
 * Options:
 *   -u, --universe <type>   Filtrer par univers : film, book, game, tvshow, bd, album, track
 *   -o, --output <file>     Fichier de sortie JSON (défaut: stdout)
 *   --done                  Seulement les œuvres complétées (défaut)
 *   --wished                Seulement les œuvres dans la wishlist
 *   --all                   Toutes les œuvres (complétées + wishlist)
 *   --with-reviews          Inclure le texte des critiques
 *
 * Exemples:
 *   npx tsx tools/senscritique-export.ts MonPseudo
 *   npx tsx tools/senscritique-export.ts MonPseudo -u film -o collection.json
 *   npx tsx tools/senscritique-export.ts MonPseudo --all -u game
 *   npx tsx tools/senscritique-export.ts MonPseudo --with-reviews -o export.json
 */

import { writeFileSync } from 'node:fs';
import {
  exportUserCollection,
  UNIVERSE_ALIASES,
} from '../src/lib/senscritique/SensCritiqueExport.ts';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  username: string;
  universe: string | null;
  output: string | null;
  mode: 'done' | 'wished' | 'all';
  withReviews: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const positional: string[] = [];
  let universe: string | null = null;
  let output: string | null = null;
  let mode: 'done' | 'wished' | 'all' = 'done';
  let withReviews = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-u' || arg === '--universe') {
      const val = args[++i];
      if (!val) die('--universe requiert une valeur.');
      const mapped = UNIVERSE_ALIASES[val.toLowerCase()];
      if (!mapped) {
        die(
          `Univers inconnu: "${val}". Valeurs acceptées: ${Object.keys(UNIVERSE_ALIASES)
            .filter((k, idx, arr) => arr.indexOf(k) === idx)
            .join(', ')}`,
        );
      }
      universe = mapped;
    } else if (arg === '-o' || arg === '--output') {
      output = args[++i];
      if (!output) die('--output requiert un nom de fichier.');
    } else if (arg === '--all') {
      mode = 'all';
    } else if (arg === '--wished') {
      mode = 'wished';
    } else if (arg === '--done') {
      mode = 'done';
    } else if (arg === '--with-reviews') {
      withReviews = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      die(`Option inconnue: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    die('Un nom d\'utilisateur est requis.\n\nUsage: npx tsx tools/senscritique-export.ts <username> [options]');
  }

  return {
    username: positional[0],
    universe,
    output,
    mode,
    withReviews,
  };
}

function die(message: string): never {
  console.error(`\nErreur: ${message}\n`);
  process.exit(1);
}

function printHelp(): void {
  console.log(`
SensCritique Export — extrait notes & dates de complétion en JSON

Usage:
  npx tsx tools/senscritique-export.ts <username> [options]

Options:
  -u, --universe <type>   Filtrer par univers :
                            film, book, game, tvshow, bd, album, track
  -o, --output <file>     Fichier de sortie JSON (défaut: stdout)
  --done                  Seulement les œuvres complétées (défaut)
  --wished                Seulement les œuvres dans la wishlist
  --all                   Toutes les œuvres (complétées + wishlist)
  --with-reviews          Inclure le texte des critiques
  -h, --help              Afficher cette aide

Exemples:
  npx tsx tools/senscritique-export.ts MonPseudo
  npx tsx tools/senscritique-export.ts MonPseudo -u film -o films.json
  npx tsx tools/senscritique-export.ts MonPseudo --all -u game
  npx tsx tools/senscritique-export.ts MonPseudo --with-reviews -o export.json
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  const { username, universe, output, mode, withReviews } = args;

  const isStdout = output === null;

  if (!isStdout) {
    console.error(`\nSensCritique Export`);
    console.error(`  Utilisateur : ${username}`);
    console.error(`  Univers     : ${universe ?? 'tous'}`);
    console.error(`  Mode        : ${mode}`);
    console.error('');
    console.error('⏳ Récupération de la collection...');
  }

  const result = await exportUserCollection(username, {
    universe,
    mode,
    withReviews,
    onProgress: isStdout
      ? undefined
      : (loaded, total) => {
          process.stderr.write(`\r   ${loaded} / ${total} éléments chargés...`);
        },
  });

  if (!isStdout) {
    process.stderr.write('\n');
    console.error(
      `✅ ${result.exportedCount} éléments exportés (total collection: ${result.totalInCollection})`,
    );
  }

  const jsonStr = JSON.stringify(result, null, 2);

  if (output) {
    writeFileSync(output, jsonStr, 'utf-8');
    console.error(`\n📄 Exporté vers : ${output} (${result.exportedCount} œuvres)`);
  } else {
    process.stdout.write(jsonStr);
    process.stdout.write('\n');
  }
}

main().catch((err) => {
  console.error(`\nErreur fatale: ${(err as Error).message}`);
  process.exit(1);
});
