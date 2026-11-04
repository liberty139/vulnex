import type { CodeFinding, Severity } from "./types";

/*
  Instant rule scanner. It runs without any model, line by line, and catches
  the obvious patterns. It cannot see logic flaws such as a missing owner check
  or an ignored signature result: that is what the AI models and, above all,
  the specialist are for.
*/

interface Rule {
  re: RegExp;
  title: string;
  severity: Severity;
  cwe: string;
  why: string;
  fix: string;
  /** Extra condition on the same line. */
  also?: RegExp;
}

const USER_INPUT = /\$_(GET|POST|REQUEST|COOKIE)|req\.(query|body|params|cookies)|request\.(args|form|cookies|json|values)/;

const RULES: Rule[] = [
  {
    re: /\b(SELECT|INSERT|UPDATE|DELETE)\b[^;]*(["'`]\s*(\.|\+)|\$\{|\{\w+\}|%s)/i,
    title: "SQL-запрос собирается из строк",
    severity: "high",
    cwe: "CWE-89",
    why: "Данные подставляются прямо в текст запроса. Если там окажется ввод пользователя, он может изменить сам запрос.",
    fix: "Используйте подготовленные запросы с параметрами (prepare/bind, плейсхолдеры ? или :name).",
  },
  {
    re: /\.innerHTML\s*=|dangerouslySetInnerHTML|document\.write\(/,
    title: "HTML вставляется без экранирования",
    severity: "medium",
    cwe: "CWE-79",
    why: "Строка попадает на страницу как разметка. Если в ней ввод пользователя, в браузере выполнится чужой скрипт.",
    fix: "Выводите данные как текст (textContent) или экранируйте их; для HTML используйте санитайзер.",
  },
  {
    re: /\b(echo|print)\b[^;]*\$_(GET|POST|REQUEST|COOKIE)|res\.send\([^)]*req\.(query|body|params)/,
    title: "Ввод пользователя выводится в ответ как есть",
    severity: "medium",
    cwe: "CWE-79",
    why: "Значение из запроса возвращается в HTML без экранирования — классический отражённый XSS.",
    fix: "Экранируйте вывод (htmlspecialchars в PHP, шаблонизатор с автоэкранированием в Node/Python).",
  },
  {
    re: /\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\s*\(|child_process|subprocess\.(call|run|Popen)\([^)]*shell\s*=\s*True|new Function\(/,
    title: "Выполнение кода или команд",
    severity: "high",
    cwe: "CWE-78",
    why: "Если в команду или код попадут внешние данные, сервер выполнит то, что передал посторонний.",
    fix: "Уберите выполнение строк; для команд передавайте аргументы списком и проверяйте их по белому списку.",
  },
  {
    re: /\b(md5|sha1)\s*\(/i,
    also: /pass|pwd|парол/i,
    title: "Пароль хешируется быстрым алгоритмом",
    severity: "medium",
    cwe: "CWE-916",
    why: "MD5 и SHA-1 считаются за наносекунды, утёкшие хеши таких паролей быстро подбираются.",
    fix: "Используйте password_hash()/bcrypt/argon2 и проверку через password_verify().",
  },
  {
    re: /(api[_-]?key|secret(_key)?|passw(or)?d|token|SECRET)\s*[:=]\s*["'][^"'\s]{3,}["']/i,
    title: "Секрет записан прямо в коде",
    severity: "high",
    cwe: "CWE-798",
    why: "Ключ виден всем, у кого есть доступ к коду или репозиторию, и его нельзя быстро сменить.",
    fix: "Храните секреты в переменных окружения или хранилище секретов и смените уже засвеченный ключ.",
  },
  {
    re: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|CURLOPT_SSL_VERIFY(PEER|HOST)\s*,\s*(false|0)/,
    title: "Отключена проверка TLS-сертификата",
    severity: "high",
    cwe: "CWE-295",
    why: "Соединение не проверяет, с кем оно установлено: ответ может подменить посредник.",
    fix: "Не отключайте проверку; для своих сертификатов укажите доверенный CA.",
  },
  {
    re: /\bunserialize\s*\(|pickle\.loads?\(|yaml\.load\((?![^)]*SafeLoader)|ObjectInputStream/,
    title: "Десериализация непроверенных данных",
    severity: "high",
    cwe: "CWE-502",
    why: "Разбор объектов из внешних данных может привести к выполнению кода на сервере.",
    fix: "Передавайте данные в JSON и проверяйте схему; не десериализуйте то, что пришло от клиента.",
  },
  {
    re: /\b(include|require)(_once)?\s*\(?[^;]*\$_(GET|POST|REQUEST)|(readFile|sendFile|open)\([^)]*(req\.(query|params)|request\.args)/,
    title: "Путь к файлу берётся из запроса",
    severity: "high",
    cwe: "CWE-22",
    why: "Через ../ можно добраться до файлов за пределами нужной папки.",
    fix: "Сопоставляйте ввод со списком разрешённых файлов или нормализуйте путь и проверяйте корень.",
  },
  {
    re: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*|cors\(\s*\)|origin\s*:\s*["']\*["']/,
    title: "CORS разрешён для любого сайта",
    severity: "medium",
    cwe: "CWE-942",
    why: "Любой сайт сможет обращаться к API из браузера пользователя.",
    fix: "Перечислите конкретные доверенные домены.",
  },
  {
    re: /display_errors["']?\s*,\s*["']?(1|on|true)|DEBUG\s*=\s*True|app\.run\([^)]*debug\s*=\s*True/i,
    title: "Включён режим отладки",
    severity: "low",
    cwe: "CWE-489",
    why: "Ошибки с путями, запросами и переменными видны посетителям сайта.",
    fix: "Выключите отладку в рабочей среде и пишите ошибки в журнал.",
  },
  {
    re: /secret_key\s*=\s*["'](dev|test|secret|changeme|123)/i,
    title: "Слабый ключ подписи сессий",
    severity: "high",
    cwe: "CWE-321",
    why: "Зная ключ, можно подделать cookie сессии и войти под любым пользователем.",
    fix: "Сгенерируйте длинный случайный ключ и храните его вне кода.",
  },
  {
    re: /except\s*(Exception)?\s*:\s*$|catch\s*\([^)]*\)\s*\{\s*\}/,
    title: "Ошибка проглатывается молча",
    severity: "low",
    cwe: "CWE-390",
    why: "Если внутри проверка безопасности, её провал не остановит выполнение.",
    fix: "Обрабатывайте ошибку явно: при провале проверки прерывайте запрос.",
  },
];

export function scanRules(code: string): CodeFinding[] {
  const out: CodeFinding[] = [];
  const lines = code.split("\n");
  lines.forEach((raw, i) => {
    // comment-only lines explain code, they are not code
    if (/^\s*(\/\/|#|\*|\/\*|<!--)/.test(raw)) return;
    for (const r of RULES) {
      if (!r.re.test(raw)) continue;
      if (r.also && !r.also.test(raw)) continue;
      // SQL rule: only flag when the concatenated part looks dynamic
      if (r.cwe === "CWE-89" && !/\$\w|\+\s*\w|\$\{|\{\w+\}|%s/.test(raw)) continue;
      const sev = r.cwe === "CWE-89" && USER_INPUT.test(raw) ? "critical" : r.severity;
      out.push({ line: i + 1, title: r.title, severity: sev, cwe: r.cwe, why: r.why, fix: r.fix });
    }
  });
  return out;
}
