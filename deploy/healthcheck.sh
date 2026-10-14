#!/usr/bin/env bash
# Runs ON the server. Quick post-deploy check: container status, recent API log,
# a real run of each sandbox language, the sandbox's lack of internet access,
# and Caddy answering for the domain.
cd /srv/trakcode/current
C=(docker compose -f deploy/docker-compose.yml --env-file /srv/trakcode/env.production)

"${C[@]}" ps --format '{{.Service}}: {{.Status}}'

echo '--- api log ---'
"${C[@]}" logs --tail 20 api

echo '--- sandbox runs (input 21, expect 42) ---'
cat > /tmp/sandbox-check.js <<'JS'
const cases = {
  python: 'print(int(input()) * 2)',
  cpp: '#include <iostream>\nint main(){ int x; std::cin >> x; std::cout << x * 2; }',
  typescript: 'const n: number = Number(require("fs").readFileSync(0, "utf8"));\nconsole.log(n * 2);',
  java: 'public class Main { public static void main(String[] a) { System.out.println(new java.util.Scanner(System.in).nextInt() * 2); } }',
};
(async () => {
  for (const [language, code] of Object.entries(cases)) {
    const res = await fetch('http://sandbox:4100/internal/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, testCases: [{ input: '21', expectedOutput: '42' }], strictTypeCheck: language === 'typescript' }),
    });
    const j = await res.json();
    console.log(language.padEnd(11), j.allPassed ? 'PASS' : 'FAIL', j.compileError || j.stderr || '');
  }
})().catch((e) => console.log('sandbox check error:', e.message));
JS
"${C[@]}" exec -T api node - < /tmp/sandbox-check.js

echo '--- sandbox internet access (should be blocked) ---'
"${C[@]}" exec -T sandbox node -e "fetch('https://example.com').then(()=>console.log('INTERNET REACHABLE - check networks')).catch(e=>console.log('blocked:', (e.cause && e.cause.code) || e.message))"

echo '--- caddy ---'
curl -s -o /dev/null -w 'http://trakcode.com via localhost -> %{http_code} %{redirect_url}\n' -H 'Host: trakcode.com' http://localhost/
free -m | head -2
