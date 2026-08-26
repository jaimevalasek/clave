# O backup pré-migração copiava um banco vazio (SQLite em WAL)

**Escopo:** `server/src/db/database.ts`, `server/src/db/migrations.ts`.
Passou por tipagem, testes de unidade, testes de API, e2e e pelo `harness:check`
inteiro — porque toda a suíte parte de um banco **novo**, onde não há nada para
perder.

## O que acontecia

`runMigrations` tira uma cópia de segurança antes de aplicar migração nova:

```ts
fs.copyFileSync(databasePath, `${databasePath}.bak`);
```

O banco do Clave roda em WAL (`openDatabase` faz `pragma('journal_mode = WAL')`).
Em WAL, o arquivo `clave.db` sozinho é o banco **do último checkpoint**: tudo que
foi escrito depois vive em `clave.db-wal`. Copiar só o `.db` produz um `.bak` que
volta o criador para um estado antigo — no caso real deste projeto, um arquivo de
4 KB sem nenhuma pauta, enquanto o `-wal` ao lado tinha 255 KB de dados de verdade.

O caminho de recuperação da migração estava, portanto, quebrado exatamente no
momento em que ele existe para servir.

## Como apareceu

Não apareceu em teste nenhum. Apareceu ao copiar o banco real do criador para uma
pasta descartável e subir o servidor buildado contra ela: o app migrou para v3 sem
erro e devolveu `{"rundowns":[]}`. A pauta não tinha sumido — ela nunca tinha sido
copiada.

**Sintoma para reconhecer:** um banco SQLite copiado "funciona" mas vem vazio ou
desatualizado, e existe um `-wal` gordo ao lado do `.db`.

## A correção

Descarregar o WAL no arquivo principal antes de copiar:

```ts
// database.ts — a interface Database ganhou checkpoint()
checkpoint() {
  handle.pragma('wal_checkpoint(TRUNCATE)');
}

// migrations.ts
function backupBeforeMigrating(db: Database, databasePath: string | null): void {
  if (!databasePath || !fs.existsSync(databasePath)) return;
  db.checkpoint();
  fs.copyFileSync(databasePath, `${databasePath}.bak`);
}
```

## Regras práticas

1. **Copiar banco SQLite em WAL é copiar três arquivos** (`.db`, `-wal`, `-shm`)
   ou um só, depois de `wal_checkpoint(TRUNCATE)`. Nunca só o `.db`.
2. **Teste que sempre parte de banco novo não cobre migração.** Para valer, a
   verificação precisa rodar sobre uma cópia de um banco com dado de verdade,
   na versão de schema anterior.
3. Vale para qualquer cópia, não só a da migração: backup manual, snapshot para
   suporte, anexo de bug report.
