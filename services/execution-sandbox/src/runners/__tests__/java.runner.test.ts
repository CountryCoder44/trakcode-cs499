import { mainClassName, runJava } from '../java.runner';
import { resolveJava } from '../../utils/interpreters';

describe('mainClassName', () => {
  it('uses the public class, which Java requires to match the file name', () => {
    expect(mainClassName('class Helper {}\npublic class Greeter { public static void main(String[] a) {} }')).toBe('Greeter');
  });

  it('falls back to the class that declares main', () => {
    expect(mainClassName('class Helper {}\nclass App {\n  static void main(String[] a) {}\n}')).toBe('App');
  });

  it('ignores class names inside comments and strings', () => {
    const code = '// public class Wrong\nclass Main { public static void main(String[] a) { System.out.println("public class Nope"); } }';
    expect(mainClassName(code)).toBe('Main');
  });

  it('defaults to Main', () => {
    expect(mainClassName('')).toBe('Main');
  });
});

// Real compile-and-run tests need a JDK on the machine (CI and the sandbox image have one).
const describeWithJdk = resolveJava() ? describe : describe.skip;

describeWithJdk('runJava (real JDK)', () => {
  jest.setTimeout(60_000);

  it('compiles once and runs every test case against stdin', async () => {
    const code = `
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner in = new Scanner(System.in);
    int a = in.nextInt();
    int b = in.nextInt();
    System.out.println(a + b);
    System.out.println("done");
  }
}`;
    const result = await runJava({
      code,
      timeoutMs: 5000,
      testCases: [
        { input: '2 3', expectedOutput: '5\ndone' },
        { input: '-4 10\n', expectedOutput: '6\ndone' },
        { input: '1 1', expectedOutput: '3\ndone' },
      ],
    });
    expect(result.compileError).toBeNull();
    expect(result.results.map((r) => r.passed)).toEqual([true, true, false]);
    expect(result.allPassed).toBe(false);
  });

  it('runs a class whose name is not Main', async () => {
    const code = 'public class Greeter { public static void main(String[] a) { System.out.println("hi"); } }';
    const result = await runJava({ code, timeoutMs: 5000, testCases: [{ input: '', expectedOutput: 'hi' }] });
    expect(result.allPassed).toBe(true);
  });

  it('reports a compile error with the file name, not the temp path', async () => {
    const code = 'public class Main { public static void main(String[] a) { int x = "text"; } }';
    const result = await runJava({ code, timeoutMs: 5000, testCases: [{ input: '', expectedOutput: '' }] });
    expect(result.results).toEqual([]);
    expect(result.compileError).toMatch(/^Main\.java:1: error: incompatible types/);
  });

  it('reports a runtime exception on stderr and fails the test', async () => {
    const code = 'public class Main { public static void main(String[] a) { int[] x = new int[1]; System.out.println(x[3]); } }';
    const result = await runJava({ code, timeoutMs: 5000, testCases: [{ input: '', expectedOutput: '0' }] });
    expect(result.allPassed).toBe(false);
    expect(result.stderr).toMatch(/ArrayIndexOutOfBoundsException/);
  });

  it('stops an infinite loop at the time limit', async () => {
    const code = 'public class Main { public static void main(String[] a) { while (true) {} } }';
    const result = await runJava({ code, timeoutMs: 1000, testCases: [{ input: '', expectedOutput: '' }] });
    expect(result.results[0].actualOutput).toBe('[timed out]');
    expect(result.allPassed).toBe(false);
  });

  it('keeps non-ASCII output intact', async () => {
    const code = 'public class Main { public static void main(String[] a) { System.out.println("café ✓"); } }';
    const result = await runJava({ code, timeoutMs: 5000, testCases: [{ input: '', expectedOutput: 'café ✓' }] });
    expect(result.allPassed).toBe(true);
  });
});

describeWithJdk('runJava with fixtures (real JDK)', () => {
  jest.setTimeout(60_000);

  it('reads a data file, compiles a provided helper class, and checks a file the program writes', async () => {
    const code = `
import java.nio.file.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    List<String> lines = Files.readAllLines(Path.of("data/scores.txt"));
    int total = 0;
    for (String l : lines) total += Integer.parseInt(l.trim());
    Files.writeString(Path.of("report.txt"), Helper.label(total) + "\\n");
    System.out.println(total);
  }
}`;
    const result = await runJava({
      code,
      timeoutMs: 5000,
      files: [{ path: 'Helper.java', content: 'public class Helper { static String label(int n) { return "total=" + n; } }' }],
      testCases: [
        { input: '', expectedOutput: '6', files: [{ path: 'data/scores.txt', content: '1\n2\n3\n' }], expectedFiles: [{ path: 'report.txt', content: 'total=6\n' }] },
        { input: '', expectedOutput: '10', files: [{ path: 'data/scores.txt', content: '10\n' }], expectedFiles: [{ path: 'report.txt', content: 'total=99\n' }] },
      ],
    });
    expect(result.compileError).toBeNull();
    expect(result.results[0].passed).toBe(true);
    expect(result.results[1].passed).toBe(false); // stdout right, written file wrong
    expect(result.results[1].fileChecks?.[0]).toMatchObject({ path: 'report.txt', passed: false });
  });
});
