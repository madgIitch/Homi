// supabase/functions/_tests/run-all-tests.ts

/**
 * Script principal para ejecutar todos los tests de edge functions
 * Ejecuta cada archivo de test y reporta un resumen consolidado
 */

interface TestFileSummary {
  file: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

async function runTestFile(filePath: string): Promise<TestFileSummary> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${filePath}`);
  console.log('='.repeat(60));

  const startTime = performance.now();

  try {
    const process = new Deno.Command(Deno.execPath(), {
      args: ['run', '--allow-all', filePath],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await process.output();
    const duration = performance.now() - startTime;

    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    console.log(output);
    if (errorOutput) {
      console.error(errorOutput);
    }

    // Parse output para extraer resumen
    const passedMatch = output.match(/Passed: (\d+)/);
    const failedMatch = output.match(/Failed: (\d+)/);
    const totalMatch = output.match(/Total: (\d+)/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;

    return {
      file: filePath.split('/').pop() || filePath,
      passed,
      failed,
      total,
      duration,
    };
  } catch (error) {
    console.error(`Error running ${filePath}:`, error);
    return {
      file: filePath.split('/').pop() || filePath,
      passed: 0,
      failed: 1,
      total: 1,
      duration: performance.now() - startTime,
    };
  }
}

async function main() {
  console.log('\n🧪 HomiMatch Edge Functions Test Suite\n');
  console.log('Running all tests...\n');

  const testFiles = [
    './supabase/functions/_tests/auth-login.test.ts',
    './supabase/functions/_tests/profiles.test.ts',
    './supabase/functions/_tests/matches.test.ts',
    './supabase/functions/_tests/room-assignments.test.ts',
    './supabase/functions/_tests/swipe-rejections.test.ts',
    './supabase/functions/_tests/invite-codes.test.ts',
    './supabase/functions/_tests/photos.test.ts',
    './supabase/functions/_tests/auth-register-phase1.test.ts',
    './supabase/functions/_tests/auth-register-phase2.test.ts',
    './supabase/functions/_tests/auth-register-phase3.test.ts',
    './supabase/functions/_tests/rooms.test.ts',
    './supabase/functions/_tests/chats.test.ts',
  ];

  const results: TestFileSummary[] = [];
  const startTime = performance.now();

  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.push(result);
  }

  const totalDuration = performance.now() - startTime;

  // Imprimir resumen consolidado
  console.log('\n' + '='.repeat(80));
  console.log('CONSOLIDATED TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  console.log('┌─────────────────────────────┬─────────┬─────────┬─────────┬────────────┐');
  console.log('│ Test File                   │ Passed  │ Failed  │ Total   │ Duration   │');
  console.log('├─────────────────────────────┼─────────┼─────────┼─────────┼────────────┤');

  for (const result of results) {
    const fileName = result.file.padEnd(27);
    const passed = result.passed.toString().padStart(7);
    const failed = result.failed.toString().padStart(7);
    const total = result.total.toString().padStart(7);
    const duration = `${result.duration.toFixed(0)}ms`.padStart(10);

    const statusIcon = result.failed === 0 ? '✅' : '❌';

    console.log(
      `│ ${statusIcon} ${fileName} │ ${passed} │ ${failed} │ ${total} │ ${duration} │`
    );

    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
  }

  console.log('├─────────────────────────────┼─────────┼─────────┼─────────┼────────────┤');
  const summaryLabel = 'TOTAL'.padEnd(27);
  const summaryPassed = totalPassed.toString().padStart(7);
  const summaryFailed = totalFailed.toString().padStart(7);
  const summaryTotal = totalTests.toString().padStart(7);
  const summaryDuration = `${totalDuration.toFixed(0)}ms`.padStart(10);

  console.log(
    `│   ${summaryLabel} │ ${summaryPassed} │ ${summaryFailed} │ ${summaryTotal} │ ${summaryDuration} │`
  );
  console.log('└─────────────────────────────┴─────────┴─────────┴─────────┴────────────┘\n');

  // Calcular porcentaje de éxito
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);

  if (totalFailed > 0) {
    console.log(`\n❌ ${totalFailed} test(s) failed\n`);
    Deno.exit(1);
  } else {
    console.log(`\n✅ All ${totalPassed} tests passed!\n`);
    Deno.exit(0);
  }
}

if (import.meta.main) {
  await main();
}
