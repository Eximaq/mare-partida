@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
set "REPO_URL=https://github.com/Eximaq/mare-partida.git"
set "REPO_NAME=Eximaq/mare-partida"
echo.
echo ===============================================
echo MARE PARTIDA - PUBLICACAO NO GITHUB
 echo Repositorio: %REPO_URL%
echo ===============================================
echo.
if not exist "index.html" (
  echo ERRO: index.html nao encontrado na pasta deste arquivo BAT.
  goto error
)
where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git para Windows nao instalado.
  echo Instale: https://git-scm.com/downloads/win
  goto error
)
if not exist ".git\HEAD" (
  git init -b main
  if errorlevel 1 goto error
)
for /f "delims=" %%I in ('git config --get user.name 2^>nul') do set "GIT_AUTHOR_NAME=%%I"
if not defined GIT_AUTHOR_NAME (
  echo Configure o nome que aparecera nos commits.
  set /p "GIT_AUTHOR_NAME=Nome do autor: "
  if not defined GIT_AUTHOR_NAME goto error
  git config --local user.name "!GIT_AUTHOR_NAME!" 2>nul
)
git config --get user.name >nul 2>&1
if errorlevel 1 git config --local user.name "%GIT_AUTHOR_NAME%"
git config --get user.email >nul 2>&1
if errorlevel 1 (
  echo Informe o email utilizado no GitHub ou um email noreply do GitHub.
  set /p "GIT_AUTHOR_EMAIL=Email de commit: "
  if not defined GIT_AUTHOR_EMAIL goto error
  git config --local user.email "!GIT_AUTHOR_EMAIL!"
)
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if defined CURRENT_BRANCH if /I not "!CURRENT_BRANCH!"=="main" (
  echo ERRO: voce esta na branch !CURRENT_BRANCH!, nao na main. Nao alterei a branch.
  goto error
)
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "CURRENT_REMOTE=%%R"
if defined CURRENT_REMOTE (
  if /I not "!CURRENT_REMOTE!"=="%REPO_URL%" (
    echo ERRO: origin aponta para !CURRENT_REMOTE!.
    echo Por seguranca, nao vou alterar outro repositorio.
    goto error
  )
) else (
  git remote add origin "%REPO_URL%"
  if errorlevel 1 goto error
)
echo Preparando arquivos do jogo, sprites e documentacao...
git add .
if errorlevel 1 goto error
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Publicar Mare Partida - projeto e site GitHub Pages"
  if errorlevel 1 goto error
) else (
  echo Sem alteracoes para commitar.
)
echo.
echo Enviando ao GitHub. Conclua a autenticacao se o Git solicitar...
git push -u origin main
if errorlevel 1 goto error
echo.
echo Repositorio publicado em https://github.com/%REPO_NAME%
echo.
where gh >nul 2>&1
if errorlevel 1 goto manual_pages
gh auth status >nul 2>&1
if errorlevel 1 goto manual_pages
echo Verificando GitHub Pages...
gh api "repos/%REPO_NAME%/pages" >nul 2>&1
if errorlevel 1 (
  echo Tentando ativar GitHub Pages com GitHub Actions...
  gh api --method POST "repos/%REPO_NAME%/pages" -f build_type=workflow >nul 2>&1
)
gh api "repos/%REPO_NAME%/pages" >nul 2>&1
if errorlevel 1 goto manual_pages
echo Pages configurado. Aguarde o workflow concluir em:
echo https://github.com/%REPO_NAME%/actions
goto done
:manual_pages
echo Para habilitar o GitHub Pages, abra:
echo https://github.com/%REPO_NAME%/settings/pages
echo Em Build and deployment, escolha GitHub Actions.
echo Depois confira https://github.com/%REPO_NAME%/actions
:done
echo.
echo Endereco previsto do jogo, apos deploy:
echo https://eximaq.github.io/mare-partida/
echo.
echo Para convidar seu amigo:
echo https://github.com/%REPO_NAME%/settings/access
echo.
echo A publicacao dos arquivos terminou. Aguarde o Pages finalizar.
pause
exit /b 0
:error
echo.
echo A PUBLICACAO NAO FOI CONCLUIDA. Nenhum push forcado foi realizado.
echo Copie a mensagem de erro para obter orientacoes.
pause
exit /b 1
