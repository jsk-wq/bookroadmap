import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dns from "node:dns/promises";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const schemaPath = join(rootDir, "supabase", "schema.sql");
const schemaSql = readFileSync(schemaPath, "utf8");

const DEFAULT_POOLER_REGIONS = [
  "ap-northeast-2",
  "ap-northeast-1",
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function getProjectRef(supabaseUrl) {
  const match = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function buildPoolerUrl(projectRef, password, region, variant = "aws-0", port = 5432) {
  const host =
    variant === "aws"
      ? `aws-${region}.pooler.supabase.com`
      : `${variant}-${region}.pooler.supabase.com`;

  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
}

function buildDirectUrl(projectRef, password) {
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function resolveDatabaseCandidates() {
  const candidates = [];
  const seen = new Set();

  function addCandidate(label, url) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ label, url });
  }

  addCandidate("SUPABASE_DB_URL", process.env.SUPABASE_DB_URL);
  addCandidate("DATABASE_URL", process.env.DATABASE_URL);

  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!password || !projectRef) return candidates;

  const regions = process.env.SUPABASE_DB_REGION
    ? [process.env.SUPABASE_DB_REGION]
    : DEFAULT_POOLER_REGIONS;
  const variants = ["aws-0", "aws-1"];

  for (const region of regions) {
    for (const variant of variants) {
      addCandidate(`pooler:${variant}:${region}:5432`, buildPoolerUrl(projectRef, password, region, variant, 5432));
      addCandidate(`pooler:${variant}:${region}:6543`, buildPoolerUrl(projectRef, password, region, variant, 6543));
    }
  }

  addCandidate("direct", buildDirectUrl(projectRef, password));
  return candidates;
}

async function resolveIpv6DirectCandidate(projectRef, password) {
  if (!projectRef || !password) return null;

  try {
    const { address } = await dns.lookup(`db.${projectRef}.supabase.co`, { family: 6 });
    return {
      label: "direct:ipv6",
      config: {
        host: address,
        port: 5432,
        user: "postgres",
        password,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
      },
    };
  } catch {
    return null;
  }
}

function printManualInstructions(lastError, sawTenantNotFound) {
  const projectRef = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "your-project-ref";

  console.log("\n자동 등록에 실패했습니다.\n");
  if (lastError) {
    console.log(`마지막 오류: ${lastError}\n`);
  }

  console.log("가장 빠른 해결 방법:");
  console.log(`1. Supabase SQL Editor 열기: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log("2. supabase/schema.sql 내용을 붙여넣고 Run 실행");
  console.log("3. 앱 새로고침 후 리뷰 다시 작성\n");

  if (sawTenantNotFound) {
    console.log("참고: pooler에서 'tenant/user not found'가 나오면 보통 아래 중 하나입니다.");
    console.log("- SUPABASE_DB_PASSWORD가 Supabase 계정 비밀번호가 아니라 데이터베이스 비밀번호가 아님");
    console.log("- Connect 화면의 Session pooler URI와 다른 리전/호스트를 사용 중\n");
    console.log("Supabase 대시보드 > Connect > Session pooler URI 전체를 복사해 .env.local에 넣으세요:");
    console.log("SUPABASE_DB_URL=복사한_URI\n");
  } else {
    console.log("자동 등록을 계속 시도하려면 .env.local에 아래를 확인하세요.\n");
    console.log("SUPABASE_DB_PASSWORD=Supabase_데이터베이스_비밀번호");
    console.log("SUPABASE_DB_REGION=ap-northeast-2");
    console.log("또는");
    console.log("SUPABASE_DB_URL=Connect_화면의_Session_pooler_URI\n");
  }

  console.log("수동 SQL 등록용 스크립트:\n");
  console.log(schemaSql);
}

async function diagnoseProject() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) {
    console.log("Supabase API 키가 없어 프로젝트 진단을 건너뜁니다.");
    return;
  }

  const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`);
  console.log(`Supabase API 연결: ${healthResponse.ok ? "성공" : `실패 (${healthResponse.status})`}`);

  const reviewsResponse = await fetch(`${supabaseUrl}/rest/v1/bookstore_reviews?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (reviewsResponse.ok) {
    console.log("리뷰 테이블: 이미 존재함");
    return;
  }

  const body = await reviewsResponse.text();
  if (body.includes("PGRST205")) {
    console.log("리뷰 테이블: 아직 없음 (등록 필요)");
    return;
  }

  console.log(`리뷰 테이블 확인 실패 (${reviewsResponse.status}): ${body}`);
}

async function verifyAnonAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return;

  const response = await fetch(`${supabaseUrl}/rest/v1/bookstore_reviews?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`익명 키로 리뷰 테이블 조회에 실패했습니다. (${response.status}) ${body}`);
  }

  console.log("익명 키로 bookstore_reviews 테이블 접근을 확인했습니다.");
}

async function connectAndApplySchema(candidate) {
  const client = new Client(
    candidate.config ?? {
      connectionString: candidate.url,
      ssl: { rejectUnauthorized: false },
    },
  );

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log(`연결 성공 (${candidate.label})`);
    console.log("bookstore_reviews 테이블과 RLS 정책을 등록했습니다.");
    await verifyAnonAccess();
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function applySchema() {
  await diagnoseProject();

  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const candidates = resolveDatabaseCandidates();
  const ipv6Candidate = await resolveIpv6DirectCandidate(projectRef, password);
  if (ipv6Candidate) candidates.unshift(ipv6Candidate);

  if (candidates.length === 0) {
    printManualInstructions();
    process.exitCode = 1;
    return;
  }

  const errors = [];
  let sawTenantNotFound = false;

  for (const candidate of candidates) {
    try {
      const applied = await connectAndApplySchema(candidate);
      if (applied) return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate.label}: ${message}`);
      if (message.includes("tenant/user")) sawTenantNotFound = true;
      console.log(`연결 실패 (${candidate.label}) - ${message}`);
    }
  }

  console.error("리뷰 테이블 자동 등록에 실패했습니다.");
  printManualInstructions(errors.at(-1), sawTenantNotFound);
  process.exitCode = 1;
}

loadEnvFile(join(rootDir, ".env.local"));
loadEnvFile(join(rootDir, ".env"));

await applySchema();
