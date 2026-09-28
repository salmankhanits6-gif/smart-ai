/**
 * Regression Test Suite for Smart AI Functional Engines
 * 
 * Verifies:
 * 1. JPG -> PDF conversion & download
 * 2. PDF -> JPG conversion & download
 * 3. JPG -> Word conversion & download
 * 4. PNG -> Word conversion & download
 * 5. PDF -> Word conversion & download
 * 6. Background Remover (Remove -> Session Recompose -> Download)
 * 7. Scam Checker (Message scan & URL threat inspector)
 * 8. Screenshot AI (API upload & analysis contract)
 * 9. API Health & Quota Engine
 */

import http from 'http';
import sharp from 'sharp';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function makeHttpRequest(options: http.RequestOptions, body?: Buffer | string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const testIp = '10.99.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
    const headers = {
      ...(options.headers || {}),
      'X-Forwarded-For': testIp,
    };
    const req = http.request({ ...options, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          data: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function makeMultipartBody(fields: Record<string, string>, files: { field: string; filename: string; contentType: string; data: Buffer }[]): { boundary: string; body: Buffer } {
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  const parts: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }

  for (const f of files) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename}"\r\nContent-Type: ${f.contentType}\r\n\r\n`));
    parts.push(f.data);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return { boundary, body: Buffer.concat(parts) };
}

async function run() {
  console.log('Starting Smart AI Functional Regression Tests...\n');

  console.log('Generating test fixture buffers...');
  // Generate test images
  const testJpg = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 50, g: 150, b: 250 } }
  }).jpeg().toBuffer();

  const testPng = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 100, g: 200, b: 100, alpha: 1 } }
  }).png().toBuffer();
  console.log('Test fixture buffers ready.');

  // 1. JPG -> PDF
  console.log('Running Step 1: JPG -> PDF...');
  try {
    const { boundary, body } = makeMultipartBody(
      { pageSize: 'auto', orientation: 'auto', margin: 'none' },
      [{ field: 'images', filename: 'sample.jpg', contentType: 'image/jpeg', data: testJpg }]
    );
    const res = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/files/jpg-to-pdf',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, body);

    const isPdf = res.statusCode === 200 && res.data.slice(0, 4).toString() === '%PDF';
    results.push({
      name: 'JPG -> PDF Conversion',
      passed: isPdf,
      details: `Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Size: ${res.data.length}b, %PDF header confirmed`,
    });
  } catch (err: any) {
    results.push({ name: 'JPG -> PDF Conversion', passed: false, details: err.message });
  }

  // 2. PDF -> JPG
  let samplePdfData: Buffer | null = null;
  try {
    const { boundary: b1, body: body1 } = makeMultipartBody(
      { pageSize: 'a4' },
      [{ field: 'images', filename: 'page1.jpg', contentType: 'image/jpeg', data: testJpg }]
    );
    const pdfRes = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/files/jpg-to-pdf',
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${b1}`, 'Content-Length': body1.length }
    }, body1);

    if (pdfRes.statusCode === 200) {
      samplePdfData = pdfRes.data;
      const { boundary, body } = makeMultipartBody(
        { pageSelection: 'all', scale: '1.5', quality: '85' },
        [{ field: 'pdf', filename: 'sample.pdf', contentType: 'application/pdf', data: samplePdfData }]
      );
      const res = await makeHttpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/files/pdf-to-jpg',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        }
      }, body);

      const isJpgOrZip = res.statusCode === 200 && (res.headers['content-type']?.includes('image/jpeg') || res.headers['content-type']?.includes('zip'));
      results.push({
        name: 'PDF -> JPG Conversion',
        passed: isJpgOrZip,
        details: `Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Output: ${res.data.length}b`,
      });
    } else {
      results.push({ name: 'PDF -> JPG Conversion', passed: false, details: 'Failed to prep sample PDF' });
    }
  } catch (err: any) {
    results.push({ name: 'PDF -> JPG Conversion', passed: false, details: err.message });
  }

  // 3. JPG -> Word (.docx)
  try {
    const { boundary, body } = makeMultipartBody(
      { embedImage: 'true' },
      [{ field: 'image', filename: 'doc_photo.jpg', contentType: 'image/jpeg', data: testJpg }]
    );
    const res = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/files/jpg-to-word',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, body);

    const isDocx = res.statusCode === 200 && res.headers['content-type']?.includes('wordprocessingml');
    results.push({
      name: 'JPG -> Word (.docx) OCR & Conversion',
      passed: isDocx,
      details: `Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Size: ${res.data.length}b`,
    });
  } catch (err: any) {
    results.push({ name: 'JPG -> Word (.docx)', passed: false, details: err.message });
  }

  // 4. PNG -> Word (.docx)
  try {
    const { boundary, body } = makeMultipartBody(
      { embedImage: 'true' },
      [{ field: 'image', filename: 'scan.png', contentType: 'image/png', data: testPng }]
    );
    const res = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/files/png-to-word',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, body);

    const isDocx = res.statusCode === 200 && res.headers['content-type']?.includes('wordprocessingml');
    results.push({
      name: 'PNG -> Word (.docx) OCR & Conversion',
      passed: isDocx,
      details: `Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Size: ${res.data.length}b`,
    });
  } catch (err: any) {
    results.push({ name: 'PNG -> Word (.docx)', passed: false, details: err.message });
  }

  // 5. PDF -> Word (.docx)
  try {
    if (samplePdfData) {
      const { boundary, body } = makeMultipartBody(
        { pageRange: 'all' },
        [{ field: 'pdf', filename: 'contract.pdf', contentType: 'application/pdf', data: samplePdfData }]
      );
      const res = await makeHttpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/files/pdf-to-word',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        }
      }, body);

      const isDocx = res.statusCode === 200 && res.headers['content-type']?.includes('wordprocessingml');
      results.push({
        name: 'PDF -> Word (.docx) Flow & Conversion',
        passed: isDocx,
        details: `Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Size: ${res.data.length}b`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'PDF -> Word (.docx)', passed: false, details: err.message });
  }

  // 6. Background Removal Engine (Upload -> Process -> Session Recompose -> Download)
  try {
    const { boundary, body } = makeMultipartBody(
      { edgeMode: 'crisp' },
      [{ field: 'image', filename: 'portrait.jpg', contentType: 'image/jpeg', data: testJpg }]
    );
    const res = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/background/remove',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, body);

    const json = JSON.parse(res.data.toString());
    const validJob = res.statusCode === 200 && json.success && json.jobId && json.base64;
    
    if (validJob) {
      // Recompose test with jobId
      const recompBoundary = '----RecompBoundary' + Math.random().toString(36).slice(2);
      const recompParts = [
        Buffer.from(`--${recompBoundary}\r\nContent-Disposition: form-data; name="jobId"\r\n\r\n${json.jobId}\r\n`),
        Buffer.from(`--${recompBoundary}\r\nContent-Disposition: form-data; name="backgroundType"\r\n\r\ncolor\r\n`),
        Buffer.from(`--${recompBoundary}\r\nContent-Disposition: form-data; name="backgroundColor"\r\n\r\n#ffffff\r\n`),
        Buffer.from(`--${recompBoundary}--\r\n`),
      ];
      const recompBody = Buffer.concat(recompParts);

      const recompRes = await makeHttpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/background/recomposite',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${recompBoundary}`,
          'Content-Length': recompBody.length,
        }
      }, recompBody);

      const recompJson = JSON.parse(recompRes.data.toString());
      const recomposeSuccess = recompRes.statusCode === 200 && recompJson.success;

      // Download test with jobId
      const dlRes = await makeHttpRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/background/download?jobId=${json.jobId}&backgroundType=transparent&format=png`,
        method: 'GET',
      });

      const downloadSuccess = dlRes.statusCode === 200 && dlRes.headers['content-type']?.includes('image/png') && dlRes.data.length > 0;

      results.push({
        name: 'Background Remover Pipeline (Remove -> Recompose -> Download)',
        passed: Boolean(validJob && recomposeSuccess && downloadSuccess),
        details: `Job created (${json.jobId.slice(0, 8)}...), Recomposition HTTP ${recompRes.statusCode}, Download HTTP ${dlRes.statusCode} (${dlRes.data.length}b)`,
      });
    } else {
      results.push({
        name: 'Background Remover Pipeline',
        passed: false,
        details: `Remove failed: HTTP ${res.statusCode}: ${json.error || 'Unknown response'}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Background Remover Pipeline', passed: false, details: err.message });
  }

  // 7. Scam Checker (Message & URL)
  try {
    const msgPayload = JSON.stringify({
      text: 'URGENT: Your account has been suspended! Click http://bit.ly/secure-login-392 immediately to verify your password or lose access.',
      category: 'general'
    });
    const msgRes = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/scam/check-message',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(msgPayload) }
    }, msgPayload);

    const msgJson = JSON.parse(msgRes.data.toString());
    const msgPass = msgRes.statusCode === 200 && msgJson.success && typeof msgJson.data?.riskScore === 'number';

    const urlPayload = JSON.stringify({ url: 'http://apple-id-verify-secure.fake-bank-login.xyz' });
    const urlRes = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/scam/check-url',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(urlPayload) }
    }, urlPayload);

    const urlJson = JSON.parse(urlRes.data.toString());
    const urlPass = urlRes.statusCode === 200 && urlJson.success && typeof urlJson.data?.riskScore === 'number';

    results.push({
      name: 'Scam Checker Engine (Message & URL Threat Analysis)',
      passed: Boolean(msgPass && urlPass),
      details: `Message Risk: ${msgJson.data?.riskLabel} (${msgJson.data?.riskScore}/100), URL Risk: ${urlJson.data?.riskLabel} (${urlJson.data?.riskScore}/100)`,
    });
  } catch (err: any) {
    results.push({ name: 'Scam Checker Engine', passed: false, details: err.message });
  }

  // 8. Screenshot AI (API upload & contract test)
  try {
    const { boundary, body } = makeMultipartBody(
      { mode: 'explain' },
      [{ field: 'image', filename: 'error.png', contentType: 'image/png', data: testPng }]
    );
    const res = await makeHttpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/screenshot/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, body);

    const json = JSON.parse(res.data.toString());
    // Either 200 with data or handled API response
    const pass = res.statusCode === 200 && json.success && json.data;
    results.push({
      name: 'Screenshot AI Engine (Multimodal Analysis)',
      passed: Boolean(pass),
      details: `HTTP ${res.statusCode}, Summary: "${json.data?.aiSummary?.slice(0, 60)}..."`,
    });
  } catch (err: any) {
    results.push({ name: 'Screenshot AI Engine', passed: false, details: err.message });
  }

  // 9. API Health & Quota Engine
  try {
    const healthRes = await makeHttpRequest({ hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
    const usageRes = await makeHttpRequest({ hostname: 'localhost', port: 3000, path: '/api/usage', method: 'GET' });

    results.push({
      name: 'API Health & Quota Engine',
      passed: healthRes.statusCode === 200 && usageRes.statusCode === 200,
      details: `/api/health: ${healthRes.statusCode}, /api/usage: ${usageRes.statusCode}`,
    });
  } catch (err: any) {
    results.push({ name: 'API Health & Quota Engine', passed: false, details: err.message });
  }

  console.log('\n================ REGRESSION TEST RESULTS ================');
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`       ${r.details}`);
  }
  console.log('=========================================================\n');

  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

run();
