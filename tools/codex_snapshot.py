#!/usr/bin/env python3
"""Bounded, read-only Git state summary for Maré Partida coding agents."""
import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    proc = subprocess.run(
        ["git", *args], cwd=ROOT, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=False, timeout=15,
    )
    return proc.stdout.strip() if proc.returncode == 0 else None


def emit(label, rows, limit=16):
    print(f"\n{label}:")
    if not rows:
        print("  (nenhum)")
        return
    for row in rows[:limit]:
        print("  " + row[:180])
    if len(rows) > limit:
        print(f"  ... {len(rows) - limit} entradas adicionais omitidas")


def main():
    parser = argparse.ArgumentParser(description="Git snapshot enxuto, sem ler arquivos grandes")
    parser.add_argument("--area", default="", help="Palavra ou prefixo de caminho para filtrar arquivos rastreados")
    parser.add_argument("--compare", default="", help="Base de comparação opcional, ex.: origin/main")
    args = parser.parse_args()
    if git("rev-parse", "--is-inside-work-tree") != "true":
        raise SystemExit("Esta ferramenta deve ser executada dentro de um repositório Git.")
    print("CODEx SNAPSHOT — estado atual, sem logs nem conteúdo-fonte")
    print("Branch:", git("branch", "--show-current") or "(detached)")
    print("Commit:", git("log", "-1", "--format=%h %s") or "(sem commit)")
    changed = (git("status", "--short") or "").splitlines()
    emit("Mudanças no workspace", changed, 20)
    if args.compare:
        files = git("diff", "--name-only", f"{args.compare}...HEAD")
        if files is None:
            print(f"\nComparação indisponível ({args.compare}); confirme se o ref existe localmente.")
        else:
            emit(f"Arquivos distintos desde {args.compare}", files.splitlines(), 25)
    if args.area:
        tracked = (git("ls-files") or "").splitlines()
        term = args.area.casefold()
        selected = [p for p in tracked if term in p.casefold()]
        emit(f"Caminhos relacionados a {args.area!r} (lista, não conteúdo)", selected, 18)
    print("\nPróximos passos: leia AGENTS.md e o índice docs/CODEX-ROUTES.md; abra apenas trechos ligados à tarefa.")


if __name__ == "__main__":
    main()
