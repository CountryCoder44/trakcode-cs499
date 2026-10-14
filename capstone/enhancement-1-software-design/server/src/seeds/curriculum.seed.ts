import { CurriculumItem, CurriculumLevel } from '../models/CurriculumItem';
import { Stack } from '../types/domain';

interface SeedItem {
  title: string;
  description: string;
  level: CurriculumLevel;
  order: number;
  lessonContent: string;
  // "Learn by doing": live starter code for the lesson's interactive editor.
  // Mechanically extracted from the worked example already embedded in
  // lessonContent below — not separately-authored content.
  starterCode: string;
  prerequisiteTitles: string[];
  // Short, stable tag, unique within a stack — see CurriculumItem.ts's
  // `topic` field comment. Powers the reverse (stack,topic)->item lookup in
  // curriculumPractice.service.ts, so these must stay unique per stack.
  topic: string;
}

// Lesson content intentionally does NOT repeat "# Title" as a markdown H1 —
// the lesson detail page already renders its own <h1> from `title`, and
// LearnLessonPage.tsx strips a leading "# ..." line defensively in case any
// future content forgets this. Each lesson is a real explanation plus a
// working code example, not a placeholder sentence — see the "clicked an
// item, got barely a sentence and a complete button" bug report this was
// written to fix.
const seedData: Record<Stack, SeedItem[]> = {
  python: [
    {
      title: 'Variables & Types',
      topic: 'variables',
      description: 'Numbers, strings, booleans, and dynamic typing.',
      level: 'intro',
      order: 1,
      lessonContent: `Python is dynamically typed — a variable's type is determined by the value you assign to it, not by a declaration. The same name can point to a number, then a string, then a list, with no type keyword anywhere.

\`\`\`python
age = 25          # int
age = "twenty"    # now a str — perfectly legal
name = "Ada"
pi = 3.14159
is_valid = True
\`\`\`

Use the built-in \`type()\` function whenever you're not sure what you're holding — \`type(age)\` returns the class of the current value, which is exactly what makes debugging type mix-ups manageable in a dynamically typed language.`,
      starterCode: `age = 25          # int
age = "twenty"    # now a str — perfectly legal
name = "Ada"
pi = 3.14159
is_valid = True
`,
      prerequisiteTitles: [],
    },
    {
      title: 'Reading Input',
      topic: 'reading-input',
      description: 'Reading from standard input, and turning text into numbers.',
      level: 'intro',
      order: 2,
      lessonContent: `\`input()\` reads one line of typed (or piped-in) text and always hands back a string — even if what's typed looks like a number, you get \`"42"\`, not \`42\`. Turning it into the type you actually need is a separate, explicit step.

\`\`\`python
name = input()               # one line, as a string
age = int(input())           # convert to int right away if you need a number

line = input()                # e.g. "3 7 12"
parts = line.split()          # ['3', '7', '12'] — still strings
numbers = [int(p) for p in parts]   # [3, 7, 12] — now real ints
\`\`\`

\`.split()\` with no arguments breaks a line on any whitespace and hands back a list of strings — the most common way to read several values from one line. Skipping the \`int()\`/\`float()\` conversion is one of the most common early bugs: \`"3" + "4"\` gives \`"34"\` (string concatenation), not \`7\`.`,
      starterCode: `line = input()
# TODO: split the line into parts and convert each one to an integer
`,
      prerequisiteTitles: ['Variables & Types'],
    },
    {
      title: 'Control Flow',
      topic: 'control-flow',
      description: 'if/elif/else, while, and for loops.',
      level: 'intro',
      order: 3,
      lessonContent: `\`if\` / \`elif\` / \`else\` branches choose which block of code runs; \`for\` and \`while\` loops repeat one. Indentation is not just style in Python — it's how the interpreter knows where a block starts and ends.

\`\`\`python
for n in range(1, 6):
    if n % 2 == 0:
        print(n, "is even")
    else:
        print(n, "is odd")
\`\`\`

\`for\` loops in Python iterate over a sequence directly (a \`range\`, a list, a string) rather than counting with an index — reach for \`while\` only when the number of iterations isn't known ahead of time.`,
      starterCode: `for n in range(1, 6):
    if n % 2 == 0:
        print(n, "is even")
    else:
        print(n, "is odd")
`,
      prerequisiteTitles: ['Reading Input'],
    },
    {
      title: 'Functions',
      topic: 'functions',
      description: 'Defining and calling functions, default args, *args/**kwargs.',
      level: 'intro',
      order: 4,
      lessonContent: `Functions are defined with \`def\` and are first-class objects — you can pass them around, store them in variables, and return them from other functions just like any other value.

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

def total(*args, **kwargs):
    print("positional:", args)
    print("keyword:", kwargs)
    return sum(args)

print(greet("Ada"))                 # Hello, Ada!
print(greet("Ada", greeting="Hi"))  # Hi, Ada!
total(1, 2, 3, verbose=True)
\`\`\`

\`*args\` collects any extra positional arguments into a tuple, and \`**kwargs\` collects extra keyword arguments into a dict — useful when a function needs to accept a flexible, unknown-ahead-of-time set of inputs.`,
      starterCode: `def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

def total(*args, **kwargs):
    print("positional:", args)
    print("keyword:", kwargs)
    return sum(args)

print(greet("Ada"))                 # Hello, Ada!
print(greet("Ada", greeting="Hi"))  # Hi, Ada!
total(1, 2, 3, verbose=True)
`,
      prerequisiteTitles: ['Control Flow'],
    },
    {
      title: 'Exception Handling',
      topic: 'exceptions',
      description: 'try/except/finally and raising custom exceptions.',
      level: 'intermediate',
      order: 5,
      lessonContent: `\`try\` / \`except\` catches runtime errors so a single bad input doesn't crash the whole program. \`finally\` runs no matter what — pass or fail — which makes it the right place for cleanup.

\`\`\`python
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("Can't divide by zero")
        return None
    finally:
        print("Division attempted")

safe_divide(10, 2)
safe_divide(10, 0)
\`\`\`

You can also raise your own exceptions with \`raise ValueError("message")\` — catch the *specific* exception type you expect, not a bare \`except:\`, or you'll silently swallow bugs you didn't anticipate.`,
      starterCode: `def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("Can't divide by zero")
        return None
    finally:
        print("Division attempted")

safe_divide(10, 2)
safe_divide(10, 0)
`,
      prerequisiteTitles: ['Functions'],
    },
    {
      title: 'Recursion',
      topic: 'recursion',
      description: 'Base cases, recursive calls, and stack depth.',
      level: 'intermediate',
      order: 6,
      lessonContent: `A recursive function calls itself with a smaller version of the same problem, until it reaches a base case simple enough to answer directly. Skip the base case and the function calls itself forever — an infinite loop that ends in a \`RecursionError\`.

\`\`\`python
def factorial(n):
    if n <= 1:                    # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))  # 120
\`\`\`

Trace \`factorial(5)\` by hand — it calls \`factorial(4)\`, which calls \`factorial(3)\`, and so on down to \`factorial(1)\`, then each call multiplies its result on the way back up. That unwind-and-multiply pattern is the shape of most recursive solutions.`,
      starterCode: `def factorial(n):
    if n <= 1:                    # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))  # 120
`,
      prerequisiteTitles: ['Functions'],
    },
  ],
  // TypeScript curriculum is being authored from scratch (see CLAUDE.md's
  // "Learn Mode overhaul") — deliberately empty until that content lands. The
  // `typescript` stack, its execution path (esbuild transpile → Node), and
  // all UI are wired and ready; only the lessons are missing.
  typescript: [],
  cpp: [
    {
      title: 'Syntax & Types',
      topic: 'syntax-types',
      description: 'Static typing, compilation, and basic I/O.',
      level: 'intro',
      order: 1,
      lessonContent: `C++ is statically typed and compiled ahead of time — every variable's type is fixed at compile time, and the compiler catches type mismatches before the program ever runs, unlike Python's dynamic typing.

\`\`\`cpp
#include <iostream>

int main() {
    int age = 25;
    double pi = 3.14159;
    std::string name = "Ada";

    std::cout << name << " is " << age << " years old." << std::endl;
    return 0;
}
\`\`\`

\`std::cin >> variable\` reads input the same way \`std::cout <<\` writes it — both chain, so \`std::cin >> a >> b;\` reads two values in one line.`,
      starterCode: `#include <iostream>

int main() {
    int age = 25;
    double pi = 3.14159;
    std::string name = "Ada";

    std::cout << name << " is " << age << " years old." << std::endl;
    return 0;
}
`,
      prerequisiteTitles: [],
    },
    {
      title: 'Pointers & References',
      topic: 'pointers-references',
      description: 'Memory addresses, pointer arithmetic, and references.',
      level: 'intro',
      order: 2,
      lessonContent: `A pointer holds a memory address and is declared with \`*\`; a reference is an alias for an existing variable, declared with \`&\`, and once bound it can never point to anything else.

\`\`\`cpp
#include <iostream>

int main() {
    int x = 10;
    int* ptr = &x;   // ptr holds the address of x
    int& ref = x;    // ref IS x, just under another name

    *ptr = 20;   // changes x through the pointer
    ref = 30;    // changes x through the reference

    std::cout << x << std::endl;  // 30
    return 0;
}
\`\`\`

Pointers can be reassigned, be null, and need explicit dereferencing (\`*ptr\`) to read the value; references can't be null and read exactly like a normal variable — prefer references unless you specifically need pointer-only behavior like reassignment or nullability.`,
      starterCode: `#include <iostream>

int main() {
    int x = 10;
    int* ptr = &x;   // ptr holds the address of x
    int& ref = x;    // ref IS x, just under another name

    *ptr = 20;   // changes x through the pointer
    ref = 30;    // changes x through the reference

    std::cout << x << std::endl;  // 30
    return 0;
}
`,
      prerequisiteTitles: ['Syntax & Types'],
    },
    {
      title: 'Memory Management',
      topic: 'memory-management',
      description: 'Stack vs. heap, new/delete, and RAII.',
      level: 'intermediate',
      order: 3,
      lessonContent: `C++ gives you two places to put data: the stack (automatic, cleaned up when a variable goes out of scope) and the heap (manual, allocated with \`new\` and freed with \`delete\`). Forget the \`delete\` and that memory leaks for the life of the program.

\`\`\`cpp
#include <iostream>

int main() {
    int* data = new int(42);   // heap allocation
    std::cout << *data << std::endl;
    delete data;                // must free manually
    data = nullptr;             // avoid a dangling pointer

    return 0;
}
\`\`\`

RAII ("Resource Acquisition Is Initialization") ties a resource's lifetime to an object's — \`std::unique_ptr\` and \`std::vector\` both use RAII internally, so their destructor cleans up automatically and you rarely need a raw \`new\`/\`delete\` pair in modern C++.`,
      starterCode: `#include <iostream>

int main() {
    int* data = new int(42);   // heap allocation
    std::cout << *data << std::endl;
    delete data;                // must free manually
    data = nullptr;             // avoid a dangling pointer

    return 0;
}
`,
      prerequisiteTitles: ['Pointers & References'],
    },
    {
      title: 'STL Containers',
      topic: 'stl-containers',
      description: 'vector, map, set, and iterators.',
      level: 'intermediate',
      order: 4,
      lessonContent: `The Standard Template Library provides generic, battle-tested data structures — \`std::vector\` (a growable array), \`std::map\` (a sorted key-value store), \`std::set\` (unique sorted values), and more — so you almost never need to hand-roll one yourself.

\`\`\`cpp
#include <iostream>
#include <vector>
#include <map>

int main() {
    std::vector<int> nums = {5, 3, 1, 4};
    nums.push_back(2);

    std::map<std::string, int> ages;
    ages["Ada"] = 28;
    ages["Grace"] = 34;

    for (const auto& [name, age] : ages) {
        std::cout << name << ": " << age << std::endl;
    }
    return 0;
}
\`\`\`

\`std::map\` keeps its keys sorted automatically — iterate it and you get entries in key order for free, which is exactly why it's a red-black tree internally rather than a hash table (that's \`std::unordered_map\`, faster but unordered).`,
      starterCode: `#include <iostream>
#include <vector>
#include <map>

int main() {
    std::vector<int> nums = {5, 3, 1, 4};
    nums.push_back(2);

    std::map<std::string, int> ages;
    ages["Ada"] = 28;
    ages["Grace"] = 34;

    for (const auto& [name, age] : ages) {
        std::cout << name << ": " << age << std::endl;
    }
    return 0;
}
`,
      prerequisiteTitles: ['Memory Management'],
    },
  ],
};

// Idempotent — upserts by (stack, title) rather than duplicating. Used by
// both the standalone seed script (persistent DBs) and dev auto-seed on boot
// (ephemeral in-memory DB — see index.ts).
export async function seedCurriculumData(): Promise<void> {
  for (const [stack, items] of Object.entries(seedData) as [Stack, SeedItem[]][]) {
    const titleToId = new Map<string, string>();

    for (const item of items) {
      const prerequisites = item.prerequisiteTitles.map((t) => titleToId.get(t)).filter(Boolean);
      // Prerequisite resolution is driven by array position (titleToId only
      // has entries for items already walked earlier in this same loop) —
      // referencing a title that appears later in the array, or a typo,
      // silently drops that prerequisite via .filter(Boolean) above with no
      // error, shipping the lesson fully unlocked. Fail loudly instead.
      if (prerequisites.length !== item.prerequisiteTitles.length) {
        throw new Error(`Seed error: "${item.title}" (${stack}) references an unresolved prerequisite title`);
      }
      const doc = await CurriculumItem.findOneAndUpdate(
        { stack, title: item.title },
        {
          stack,
          title: item.title,
          topic: item.topic,
          description: item.description,
          level: item.level,
          order: item.order,
          lessonContent: item.lessonContent,
          starterCode: item.starterCode,
          prerequisites,
        },
        { upsert: true, new: true }
      );
      titleToId.set(item.title, doc.id);
    }
  }
}
