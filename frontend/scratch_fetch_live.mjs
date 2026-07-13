const url = 'https://taskflow.arslanyusuf.com/api/health';

console.log('Fetching', url);
try {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  });

  console.log('Status:', res.status, res.statusText);
  console.log('Headers:');
  for (const [name, val] of res.headers.entries()) {
    console.log(`  ${name}: ${val}`);
  }

  const body = await res.text();
  console.log('Body:');
  console.log(body);
} catch (err) {
  console.error('Fetch error:', err);
}
