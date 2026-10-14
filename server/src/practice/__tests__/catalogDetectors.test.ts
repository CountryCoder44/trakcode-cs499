import { conceptEvidence, scanConcepts } from '../staticAnalysis';

// Detector regressions against the REAL catalog. Found live: every real
// generated draft was rejected as "using recursion" because `def main(): ...`
// followed by `main()` at the bottom looked like a self-call. Ordinary basics
// programs must scan as zero advanced concepts.

describe('real catalog: ordinary basics code has no advanced concepts', () => {
  it('python', () => {
    const code = [
      'def main():',
      '    key = input().strip()',
      '    date = input()',
      '    parts = date.split("-")',
      '    total = 0',
      '    for p in parts:',
      '        total += int(p)',
      '    nums = sorted([3, 1, 2])',
      '    print(f"{key}: {total} {nums}")',
      '',
      'main()',
    ].join('\n');
    expect(scanConcepts(code, 'python').advanced).toEqual([]);
  });

  it('typescript', () => {
    const code = [
      "import { readFileSync } from 'fs';",
      "const lines: string[] = readFileSync(0, 'utf8').trim().split('\\n');",
      'function main(): void {',
      '  let total = 0;',
      '  for (const line of lines) {',
      '    if (line.length > 0) total += Number(line);',
      '  }',
      '  console.log(`Total: ${total}`);',
      '}',
      'main();',
    ].join('\n');
    expect(scanConcepts(code, 'typescript').advanced).toEqual([]);
  });

  it('cpp', () => {
    const code = [
      '#include <iostream>',
      '#include <string>',
      'using namespace std;',
      'int square(int x) {',
      '  return x * x;',
      '}',
      'int main() {',
      '  int n;',
      '  cin >> n;',
      '  if (n > 0 && n < 100) {',
      '    cout << square(n) << endl;',
      '  }',
      '  return 0;',
      '}',
    ].join('\n');
    expect(scanConcepts(code, 'cpp').advanced).toEqual([]);
  });
});

describe('real catalog: recursion means a call inside the function itself', () => {
  it('python', () => {
    expect(conceptEvidence('def fact(n):\n    if n < 2:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(5))', 'python', ['recursion'])[0].passed).toBe(true);
    expect(conceptEvidence('def run():\n    print(1)\n\nrun()', 'python', ['recursion'])[0].passed).toBe(false);
  });

  it('typescript', () => {
    expect(conceptEvidence('function f(n: number): number { return n < 2 ? 1 : n * f(n - 1); }', 'typescript', ['recursion'])[0].passed).toBe(true);
    expect(conceptEvidence('const f = (n: number): number => (n < 2 ? 1 : n * f(n - 1));', 'typescript', ['recursion'])[0].passed).toBe(true);
    expect(conceptEvidence('function main(): void { console.log(1); }\nmain();', 'typescript', ['recursion'])[0].passed).toBe(false);
  });

  it('cpp', () => {
    expect(conceptEvidence('int f(int n) {\n  if (n < 2) return 1;\n  return n * f(n - 1);\n}\nint main() { return f(3); }', 'cpp', ['recursion'])[0].passed).toBe(true);
    expect(conceptEvidence('int f(int n) {\n  return n;\n}\nint main() { return f(3); }', 'cpp', ['recursion'])[0].passed).toBe(false);
  });
});

describe('real catalog: tightened detectors still catch the real thing', () => {
  it('sorting with key= and datetime', () => {
    expect(conceptEvidence('rows.sort(key=lambda r: r[1])', 'python', ['lambda-sorting'])[0].passed).toBe(true);
    expect(conceptEvidence('ordered = sorted(names, key=len)', 'python', ['lambda-sorting'])[0].passed).toBe(true);
    expect(conceptEvidence('from datetime import date\nd = date(2024, 1, 2)', 'python', ['datetime'])[0].passed).toBe(true);
  });
});

describe('real catalog: Java', () => {
  const basics = [
    'import java.util.*;',
    '',
    'public class Main {',
    '  static int total(int[] nums) {',
    '    int sum = 0;',
    '    for (int n : nums) sum += n;',
    '    return sum;',
    '  }',
    '',
    '  public static void main(String[] args) {',
    '    Scanner in = new Scanner(System.in);',
    '    int count = in.nextInt();',
    '    int[] nums = new int[count];',
    '    for (int i = 0; i < count; i++) nums[i] = in.nextInt();',
    '    if (count > 0) System.out.println("Total: " + total(nums));',
    '  }',
    '}',
  ].join('\n');

  it('ordinary basics code has no advanced concepts, and its methods are seen', () => {
    const scan = scanConcepts(basics, 'java');
    expect(scan.advanced).toEqual([]);
    expect(scan.foundation).toEqual(expect.arrayContaining(['conditionals', 'loops', 'methods']));
  });

  it('recognises recursion, a class of its own, and a HashMap', () => {
    const recursive = 'public class Main {\n  static int fact(int n) {\n    if (n < 2) return 1;\n    return n * fact(n - 1);\n  }\n  public static void main(String[] a) { System.out.println(fact(5)); }\n}';
    expect(conceptEvidence(recursive, 'java', ['recursion'])[0].passed).toBe(true);
    expect(conceptEvidence(basics, 'java', ['recursion'])[0].passed).toBe(false);

    const withClass = 'class Item {\n  String name;\n  Item(String n) { name = n; }\n}\npublic class Main {\n  public static void main(String[] a) { Item i = new Item("x"); System.out.println(i.name); }\n}';
    expect(conceptEvidence(withClass, 'java', ['classes-objects'])[0].passed).toBe(true);
    expect(conceptEvidence(basics, 'java', ['classes-objects'])[0].passed).toBe(false);

    const withMap = 'import java.util.*;\npublic class Main { public static void main(String[] a) { Map<String, Integer> m = new HashMap<>(); m.put("a", 1); } }';
    expect(conceptEvidence(withMap, 'java', ['hashmap'])[0].passed).toBe(true);
  });
});
