import type { Severity } from "./ai/types";

/*
  Demo content. Everything here is invented for the prototype and is marked
  «демо» in the UI: these are not real clients, specialists or findings.
*/

export interface Scope {
  inScope: string[];
  outOfScope: string[];
  allowed: string[];
  forbidden: string[];
  focus: string[];
}

export interface Project {
  id: string;
  name: string;
  kind: string;
  url: string;
  stack: string;
  description: string;
  scope: Scope;
  level: Level;
  reward: string;
  team: string;
  demo?: boolean;
  createdAt: number;
}

export type ReportStatus = "new" | "confirmed" | "fixed" | "rejected";

export interface Report {
  id: string;
  projectId: string;
  title: string;
  category: string;
  severity: Severity;
  steps: string;
  impact: string;
  evidence: string;
  author: string;
  mine?: boolean;
  status: ReportStatus;
  createdAt: number;
  aiChecked?: boolean;
}

export const STATUS_LABEL: Record<ReportStatus, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  fixed: "Исправлен",
  rejected: "Отклонён",
};

export type Level = "Новичок" | "Практик" | "Проверенный" | "Эксперт";

export const LEVELS: { name: Level; from: number; opens: string }[] = [
  { name: "Новичок", from: 0, opens: "Учебные и простые проекты, отчёты проходят двойную проверку" },
  { name: "Практик", from: 100, opens: "Проекты стартапов с вознаграждением репутацией" },
  { name: "Проверенный", from: 300, opens: "Оплачиваемые проверки, приглашения в закрытые проекты" },
  { name: "Эксперт", from: 700, opens: "Корпоративные проекты, роль ревьюера для новичков" },
];

export function levelOf(points: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (points >= LEVELS[k].from) i = k;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return { cur, next, index: i, progress: next ? (points - cur.from) / (next.from - cur.from) : 1 };
}

export const CATEGORIES = [
  "Доступ к чужим данным (IDOR)",
  "SQL-инъекция",
  "XSS",
  "Аутентификация и сессии",
  "Проверка подписи / сертификатов",
  "Секреты и конфигурация",
  "Бизнес-логика",
  "Другое",
];

const day = 86_400_000;
const now = Date.now();

export const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-clinic",
    name: "Запись к врачу",
    kind: "Веб-приложение",
    url: "https://staging.clinic-demo.fortera.test",
    stack: "PHP 8.3, MySQL, Laravel",
    description: "Онлайн-запись в частные клиники: выбор врача, время, SMS-подтверждение, личный кабинет пациента.",
    team: "Команда из 4 человек, без специалиста по безопасности",
    level: "Новичок",
    reward: "Репутация + рекомендация от команды",
    demo: true,
    createdAt: now - 9 * day,
    scope: {
      inScope: ["Личный кабинет пациента", "Форма записи и отмены приёма", "Вход по SMS-коду", "Поиск врачей"],
      outOfScope: ["Рабочий сайт и реальные данные пациентов", "SMS-провайдер", "Инфраструктура хостинга"],
      allowed: ["Тестовые аккаунты из описания программы", "Ручная проверка в браузере", "Сканеры в щадящем режиме"],
      forbidden: ["Нагрузочные атаки и DoS", "Социальная инженерия сотрудников", "Доступ к данным других тестировщиков"],
      focus: ["Доступ к чужим записям", "Перебор SMS-кодов"],
    },
  },
  {
    id: "demo-market",
    name: "Ремесленный маркет",
    kind: "Маркетплейс",
    url: "https://staging.craft-demo.fortera.test",
    stack: "Node.js, Express, PostgreSQL, React",
    description: "Площадка, где мастера продают изделия ручной работы: каталог, корзина, кабинет продавца, отзывы.",
    team: "3 разработчика",
    level: "Практик",
    reward: "Оплата за подтверждённые находки",
    demo: true,
    createdAt: now - 5 * day,
    scope: {
      inScope: ["Кабинет продавца", "API заказов", "Отзывы и загрузка фото"],
      outOfScope: ["Платёжный шлюз", "Почтовые рассылки"],
      allowed: ["Тестовые аккаунты продавца и покупателя", "Изменение своих запросов через прокси"],
      forbidden: ["Реальные покупки", "Массовые запросы чаще 5 в секунду", "Публикация находок до исправления"],
      focus: ["Изменение чужих товаров", "XSS в отзывах"],
    },
  },
  {
    id: "demo-school",
    name: "Школьный дневник",
    kind: "Веб + мобильное приложение",
    url: "https://staging.diary-demo.fortera.test",
    stack: "Python, Django, Flutter",
    description: "Электронный дневник для частных школ: оценки, расписание, чат учителя с родителями.",
    team: "Стартап из 5 человек",
    level: "Новичок",
    reward: "Репутация",
    demo: true,
    createdAt: now - 2 * day,
    scope: {
      inScope: ["Кабинет родителя", "Чат учитель — родитель", "API мобильного приложения"],
      outOfScope: ["Реальные школы и ученики", "Магазины приложений"],
      allowed: ["Тестовая школа с вымышленными учениками", "Ручная проверка API"],
      forbidden: ["Любые действия с реальными аккаунтами", "Автоматические сканеры без согласования"],
      focus: ["Доступ родителя к чужим оценкам", "Права учителя"],
    },
  },
];

export const DEMO_REPORTS: Report[] = [
  {
    id: "r-1",
    projectId: "demo-clinic",
    title: "Чужие записи к врачу открываются по номеру",
    category: "Доступ к чужим данным (IDOR)",
    severity: "high",
    steps:
      "1. Войти тестовым пациентом A и открыть свою запись: /appointments/1042.\n2. Изменить номер в адресе на 1041.\n3. Открывается запись другого тестового пациента: ФИО, врач, время.",
    impact: "Любой пациент может просматривать записи других пациентов, включая специализацию врача — это медицинская тайна.",
    evidence: "Скриншоты двух запросов, тестовые аккаунты A и B.",
    author: "aru_sec",
    status: "new",
    createdAt: now - 1 * day,
  },
  {
    id: "r-2",
    projectId: "demo-clinic",
    title: "Нет ограничения попыток ввода SMS-кода",
    category: "Аутентификация и сессии",
    severity: "medium",
    steps: "1. Запросить вход по номеру тестового аккаунта.\n2. Ввести неверный код 20 раз подряд.\n3. Блокировки и задержки нет, код действует 10 минут.",
    impact: "4-значный код можно подобрать перебором и войти в чужой кабинет.",
    evidence: "Журнал 20 запросов с ответами 401 без задержки.",
    author: "nurik_ctf",
    status: "confirmed",
    createdAt: now - 3 * day,
  },
  {
    id: "r-3",
    projectId: "demo-market",
    title: "Скрипт в тексте отзыва выполняется у покупателей",
    category: "XSS",
    severity: "medium",
    steps: "1. Оставить отзыв к тестовому товару с HTML-разметкой.\n2. Открыть страницу товара другим тестовым аккаунтом.\n3. Разметка отображается без экранирования.",
    impact: "Злоумышленник может выполнять действия от имени покупателей, открывших страницу товара.",
    evidence: "Скриншот страницы товара, текст отзыва.",
    author: "dana.ib",
    status: "fixed",
    createdAt: now - 4 * day,
  },
];

/* ------------------------------------------------------------ code samples */

export interface Sample {
  id: string;
  label: string;
  lang: string;
  hint: string;
  code: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "php-login",
    label: "PHP · вход на сайт",
    lang: "PHP",
    hint: "Классика: запрос из строк, слабый хеш, вывод без экранирования",
    code: `<?php
ini_set('display_errors', '1');
$db = new mysqli('localhost', 'app', 'app_pass_2024', 'clinic');

$login = $_POST['login'];
$pass  = md5($_POST['password']);

$sql = "SELECT id, name FROM users WHERE login = '" . $login . "' AND password = '" . $pass . "'";
$res = $db->query($sql);

if ($row = $res->fetch_assoc()) {
    $_SESSION['user_id'] = $row['id'];
    header('Location: /cabinet');
} else {
    echo "Пользователь " . $_GET['login'] . " не найден";
}
`,
  },
  {
    id: "node-orders",
    label: "Node.js · API заказов",
    lang: "JavaScript (Node.js)",
    hint: "Есть ошибка логики, которую правила не видят",
    code: `const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
const SECRET = "craft-market-secret";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  req.user = jwt.verify(token, SECRET);
  next();
}

// заказ по номеру
app.get("/api/orders/:id", auth, async (req, res) => {
  const order = await db.one("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  res.json(order);
});

app.get("/search", (req, res) => {
  res.send("<h1>Результаты для: " + req.query.q + "</h1>");
});

app.listen(3000);
`,
  },
  {
    id: "py-ecp",
    label: "Python · вход по ЭЦП",
    lang: "Python (Flask)",
    hint: "Подпись «проверяется», но войти можно под чужим ИИН",
    code: `from flask import Flask, request, session
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
import base64, pickle, requests

app = Flask(__name__)
app.secret_key = "dev"

@app.post("/login/ecp")
def login_ecp():
    cert = x509.load_pem_x509_certificate(request.form["cert"].encode())
    signature = base64.b64decode(request.form["signature"])
    challenge = session.get("challenge", "").encode()

    # подпись проверяется ключом из присланного сертификата
    try:
        cert.public_key().verify(signature, challenge, padding.PKCS1v15(), hashes.SHA256())
    except Exception:
        pass

    # статус сертификата в OCSP
    requests.get("https://ocsp.example.kz/check", params={"sn": cert.serial_number}, verify=False)

    iin = cert.subject.get_attributes_for_oid(x509.NameOID.SERIAL_NUMBER)[0].value
    session["user"] = iin
    return {"ok": True, "iin": iin}

@app.get("/profile")
def profile():
    prefs = pickle.loads(base64.b64decode(request.cookies.get("prefs", "gAN9cQAu")))
    return {"user": session.get("user"), "prefs": prefs}
`,
  },
];

/* --------------------------------------------------------- landing facts */

export const FACTS = [
  {
    big: "70%",
    label: "сайтов в мире работают на PHP",
    text: "Октябрь 2026: две критические уязвимости PHP2Shell. По словам Cloudflare, попытки атак выросли до миллионов. Под ударом оказалась большая часть интернета.",
    src: "W3Techs, CISA, Cloudflare · окт. 2026",
    href: "https://www.cisa.gov/news-events/alerts/2026/10/21/critical-vulnerabilities-php-require-immediate-patching",
  },
  {
    big: "45%",
    label: "кода от ИИ содержали уязвимости",
    text: "Veracode проверила более 100 нейросетевых моделей на 80 задачах в четырёх языках. Нейросети не думают о безопасности, если их не попросить.",
    src: "Veracode, 2025 GenAI Code Security Report",
    href: "https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/",
  },
  {
    big: "$6,3 млрд",
    label: "ущерб от одного взлома",
    text: "Binance, 29 октября 2026. По версии биржи, атака началась с заражённого ноутбука сотрудника. Расследование продолжается.",
    src: "BleepingComputer, TRM Labs · 30.10.2026",
    href: "https://www.bleepingcomputer.com/news/security/binance-links-63-billion-crypto-theft-to-compromised-devops-laptop/",
  },
];
