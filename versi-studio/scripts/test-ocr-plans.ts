import { config } from 'dotenv';
config({ path: '.env.local' });

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pdf } from 'pdf-to-img';
import { detectPlanScale } from '../src/lib/vs/plan-scale-detector';

const plansDir = join(process.cwd(), 'reference-existant', 'plans-test');
const plans = [
  'P 00 - Pr2_plan RDC_ projet2.pdf',
  'P 01 - Pr2_plan R+1_ projet2.pdf',
  'P 02 - Pr2_plan R+2_ projet2.pdf',
  'P 03 - Pr02_plan R+3_ projet02.pdf',
];

type Row = {
  plan: string;
  scale_text: string | null;
  scale_ratio: number | null;
  ref_dim: string | null;
  confidence: number | null;
  reasoning: string | null;
  error: string | null;
};

async function pdfToPng(pdfPath: string): Promise<Buffer> {
  const document = await pdf(pdfPath, { scale: 2 });
  for await (const page of document) {
    return Buffer.from(page);
  }
  throw new Error('Aucune page dans le PDF');
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY absent de .env.local');
  }
  console.log('OPENAI_API_KEY detectee (longueur:', process.env.OPENAI_API_KEY.length, ')');

  const rows: Row[] = [];
  for (const plan of plans) {
    const pdfPath = join(plansDir, plan);
    console.log(`\n--- ${plan} ---`);
    try {
      const pngBuffer = await pdfToPng(pdfPath);
      console.log(`PNG genere: ${pngBuffer.length} bytes`);

      // Convertir Buffer en base64 string pour detectPlanScale
      const imageBase64 = pngBuffer.toString('base64');
      const mimeType = 'image/png';

      const result = await detectPlanScale(imageBase64, mimeType);
      rows.push({
        plan,
        scale_text: result.scale_text ?? null,
        scale_ratio: result.scale_ratio ?? null,
        ref_dim: result.reference_dimension
          ? `${result.reference_dimension.text}: ${result.reference_dimension.meters}m (${result.reference_dimension.location_hint})`
          : null,
        confidence: result.confidence,
        reasoning: result.reasoning,
        error: null,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rows.push({ plan, scale_text: null, scale_ratio: null, ref_dim: null, confidence: null, reasoning: null, error: msg });
      console.error(`ERREUR ${plan}:`, msg);
    }
  }

  console.log('\n\n=== RESULTATS ===');
  console.table(rows.map(r => ({
    plan: r.plan.slice(0, 30),
    scale: r.scale_text ?? '-',
    ratio: r.scale_ratio ?? '-',
    conf: r.confidence ?? '-',
    err: r.error ? 'YES' : '-',
  })));

  // Persist raw results
  const out = join(process.cwd(), 'scripts', 'test-ocr-plans.result.json');
  writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`\nResultats sauvegardes dans ${out}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
